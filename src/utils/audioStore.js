import * as THREE from 'three'
import config from '../core/audio/audioConfig.json'

const store = {
  listener: null,
  tracks: {},
  globalVolume: config.globalVolume,
  unlocked: false,
  pending: {},
}

const subtitleState = {
  activeId: null,
  startedAt: 0,
  current: '',
  listeners: new Set(),
  rafId: 0,
}

export function initAudio(camera) {
  if (store.listener) return
  store.listener = new THREE.AudioListener()
  camera.add(store.listener)
  _loadTracks()
}

function _srtTimeToSec(t) {
  const [h, m, rest] = t.split(':')
  const [s, ms] = rest.split(',')
  return +h * 3600 + +m * 60 + +s + +ms / 1000
}

function _parseSRT(src) {
  return src
    .replace(/\r/g, '')
    .split(/\n\n+/)
    .filter(Boolean)
    .map((block) => {
      const lines = block.split('\n')
      if (!lines[1] || !lines[1].includes('-->')) return null
      const [from, to] = lines[1].split(' --> ')
      return {
        from: _srtTimeToSec(from),
        to: _srtTimeToSec(to),
        text: lines.slice(2).join(' ').trim(),
      }
    })
    .filter(Boolean)
}

function _loadSubtitles(trackCfg, registered) {
  const srt = trackCfg.subtitles
  if (!srt || typeof srt !== 'string') return
  fetch(`/subtitles/${srt}`)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.text()
    })
    .then((txt) => {
      registered.cfg.subtitles = _parseSRT(txt)
    })
    .catch(() => {
      registered.cfg.subtitles = []
    })
}

function _loadTracks() {
  const loader = new THREE.AudioLoader()

  for (const trackCfg of config.tracks) {
    const audio = new THREE.Audio(store.listener)

    loader.load(`/audio/${trackCfg.src}`, (buffer) => {
      audio.setBuffer(buffer)
      audio.setLoop(trackCfg.loop)
      audio.setVolume(trackCfg.volume * store.globalVolume)
      const registered = { audio, cfg: { ...trackCfg, subtitles: [] } }
      store.tracks[trackCfg.id] = registered

      _loadSubtitles(trackCfg, registered)

      const queued = store.pending[trackCfg.id]
      if (queued) {
        queued.forEach((fn) => fn())
        delete store.pending[trackCfg.id]
      }

      if (store.unlocked && trackCfg.autoplay) audio.play()
    })
  }
}

function _whenReady(id, fn) {
  if (store.tracks[id]) {
    fn()
    return
  }
  if (!store.pending[id]) store.pending[id] = []
  store.pending[id].push(fn)
}

function _resumeContext() {
  const ctx = store.listener && store.listener.context
  if (ctx && ctx.state === 'suspended') ctx.resume()
}

export function unlockAndPlay() {
  store.unlocked = true
  _resumeContext()
  for (const [, { audio, cfg }] of Object.entries(store.tracks)) {
    if (cfg.autoplay && !audio.isPlaying) audio.play()
  }
}

function _emitSubtitle(text) {
  if (text === subtitleState.current) return
  subtitleState.current = text
  subtitleState.listeners.forEach((fn) => fn(text))
}

function _tickSubtitles() {
  const id = subtitleState.activeId
  if (!id) return
  const track = store.tracks[id]
  if (!track || !track.audio.isPlaying) {
    subtitleState.activeId = null
    subtitleState.rafId = 0
    _emitSubtitle('')
    return
  }
  const elapsed = (performance.now() - subtitleState.startedAt) / 1000
  const cue = (track.cfg.subtitles || []).find((s) => elapsed >= s.from && elapsed < s.to)
  _emitSubtitle(cue ? cue.text : '')
  subtitleState.rafId = requestAnimationFrame(_tickSubtitles)
}

function _startSubtitles(id) {
  const track = store.tracks[id]
  if (!track) return
  const subs = track.cfg.subtitles
  if (!subs || subs.length === 0) return
  subtitleState.activeId = id
  subtitleState.startedAt = performance.now()
  if (!subtitleState.rafId) {
    subtitleState.rafId = requestAnimationFrame(_tickSubtitles)
  }
}

export function subscribeSubtitles(fn) {
  subtitleState.listeners.add(fn)
  fn(subtitleState.current)
  return () => subtitleState.listeners.delete(fn)
}

// Affiche du texte dans la zone dialogue sans audio.
// duration > 0 : disparaît automatiquement après N ms.
// duration = 0 : reste affiché jusqu'au prochain appel.
export function showDialog(text, duration = 0) {
  if (subtitleState.rafId) {
    cancelAnimationFrame(subtitleState.rafId)
    subtitleState.rafId = 0
    subtitleState.activeId = null
  }
  _emitSubtitle(text)
  if (duration > 0) setTimeout(() => _emitSubtitle(''), duration)
}

export function hideDialog() {
  _emitSubtitle('')
}

export function play(id) {
  _whenReady(id, () => {
    _resumeContext()
    const { audio } = store.tracks[id]
    if (!audio.isPlaying) audio.play()
    _startSubtitles(id)
  })
}

export function playOnce(id) {
  _whenReady(id, () => {
    _resumeContext()
    const { audio } = store.tracks[id]
    if (audio.isPlaying) audio.stop()
    audio.play()
    _startSubtitles(id)
  })
}

export function stop(id) {
  const track = store.tracks[id]
  if (!track || !track.audio.isPlaying) return
  track.audio.stop()
}

export function stopAll() {
  for (const { audio } of Object.values(store.tracks)) {
    if (audio.isPlaying) audio.stop()
  }
}

function _playAndWait(audio, id) {
  return new Promise((resolve) => {
    _resumeContext()
    if (audio.isPlaying) audio.stop()
    const prev = audio.onEnded
    audio.onEnded = function () {
      prev.call(this)
      audio.onEnded = prev
      resolve()
    }
    audio.play()
    if (id) _startSubtitles(id)
  })
}

export async function playSequence(ids, { gap = 0, stopOthers = false } = {}) {
  for (const id of ids) {
    await new Promise((resolve) => {
      _whenReady(id, async () => {
        const { audio, cfg } = store.tracks[id]
        if (cfg.loop) {
          if (!audio.isPlaying) audio.play()
          resolve()
          return
        }
        if (stopOthers) stopAll()
        await _playAndWait(audio, id)
        resolve()
      })
    })
    if (gap > 0) await new Promise((r) => setTimeout(r, gap))
  }
}

export function fade(id, to, duration = 500) {
  _whenReady(id, () => {
    _resumeContext()
    const { audio, cfg } = store.tracks[id]
    const ctx = audio.context
    const gain = audio.gain.gain
    const target = to * store.globalVolume
    const now = ctx.currentTime
    const end = now + duration / 1000

    if (!audio.isPlaying && to > 0) audio.play()

    gain.cancelScheduledValues(now)
    gain.setValueAtTime(gain.value, now)
    gain.linearRampToValueAtTime(target, end)

    cfg.volume = to

    if (to === 0) {
      setTimeout(() => {
        if (audio.isPlaying) audio.stop()
      }, duration)
    }
  })
}

export function setTrackVolume(id, volume) {
  const track = store.tracks[id]
  if (!track) return
  track.cfg.volume = volume
  track.audio.setVolume(volume * store.globalVolume)
}

export function setGlobalVolume(volume) {
  store.globalVolume = volume
  for (const { audio, cfg } of Object.values(store.tracks)) {
    audio.setVolume(cfg.volume * volume)
  }
}

export function getConfig() {
  return config
}
export function getTracks() {
  return store.tracks
}
export function getGlobalVolume() {
  return store.globalVolume
}
