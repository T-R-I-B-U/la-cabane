import * as THREE from 'three'
import config from '../core/audio/audioConfig.json'

// Store audio global : initialise le listener Three.js, charge les tracks,
// et centralise lecture, dialogues et sous-titres pour l'app entière.
const store = {
  camera: null,
  listener: null,
  tracks: {},
  globalVolume: config.globalVolume,
  unlocked: false,
  pending: {},
  fadeTimeouts: new Map(),
}

const subtitleState = {
  activeId: null,
  activeSpeaker: null,
  startedAt: 0,
  current: { text: '', speaker: null, choices: null },
  frozen: false,
  choices: null,
  onLastCue: null,
  lastCueFired: false,
  listeners: new Set(),
  rafId: 0,
  hideTimeoutId: 0,
  textTimers: [],
}

function _clearDialogHideTimeout() {
  if (!subtitleState.hideTimeoutId) return
  clearTimeout(subtitleState.hideTimeoutId)
  subtitleState.hideTimeoutId = 0
}

function _clearFadeTimeout(id) {
  const timeoutId = store.fadeTimeouts.get(id)
  if (!timeoutId) return
  clearTimeout(timeoutId)
  store.fadeTimeouts.delete(id)
}

function _warnAudio(message) {
  if (!import.meta.env.DEV) return
  console.warn(`[Audio] ${message}`)
}

function _runPreviousOnEnded(previousOnEnded, context) {
  if (typeof previousOnEnded === 'function') previousOnEnded.call(context)
}

function _getTrack(id) {
  return store.tracks[id] ?? null
}

function _getAudioTrack(id) {
  const track = _getTrack(id)
  if (!track?.audio) return null
  return track
}

function _clearTextTimers() {
  subtitleState.textTimers.forEach(clearTimeout)
  subtitleState.textTimers = []
}

function _stopCurrentDialogue() {
  subtitleState.frozen = false
  subtitleState.choices = null
  subtitleState.onLastCue = null
  subtitleState.lastCueFired = false
  _clearTextTimers()
  _clearDialogHideTimeout()
  if (subtitleState.activeId) {
    const track = _getAudioTrack(subtitleState.activeId)
    if (track?.audio?.isPlaying) track.audio.stop()
  }
  subtitleState.activeId = null
  subtitleState.activeSpeaker = null
  if (subtitleState.rafId) {
    cancelAnimationFrame(subtitleState.rafId)
    subtitleState.rafId = 0
  }
}

export function initAudio(camera) {
  if (!store.listener) {
    store.listener = new THREE.AudioListener()
    _loadTracks()
  }

  if (!camera || store.camera === camera) return

  if (store.camera) store.camera.remove(store.listener)
  camera.add(store.listener)
  store.camera = camera
}

export function detachAudio(camera) {
  if (!store.listener || !camera || store.camera !== camera) return
  camera.remove(store.listener)
  store.camera = null
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

function _flushPending(id) {
  const queued = store.pending[id]
  if (!queued) return
  queued.forEach((fn) => fn())
  delete store.pending[id]
}

// Charge le SRT puis enregistre la track (pour les tracks sans src audio).
function _loadSubtitlesThenRegister(trackCfg) {
  const registered = { audio: null, cfg: { ...trackCfg, subtitles: [] } }
  const srt = trackCfg.subtitles
  if (!srt || typeof srt !== 'string') {
    store.tracks[trackCfg.id] = registered
    _flushPending(trackCfg.id)
    return
  }
  fetch(`/subtitles/${srt}`)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.text()
    })
    .then((txt) => {
      registered.cfg.subtitles = _parseSRT(txt)
    })
    .catch((error) => {
      _warnAudio(`Cannot load subtitles "${srt}" for "${trackCfg.id}": ${error}`)
      registered.cfg.subtitles = []
    })
    .finally(() => {
      store.tracks[trackCfg.id] = registered
      _flushPending(trackCfg.id)
    })
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
    .catch((error) => {
      _warnAudio(`Cannot load subtitles "${srt}" for "${trackCfg.id}": ${error}`)
      registered.cfg.subtitles = []
    })
}

function _loadTracks() {
  const loader = new THREE.AudioLoader()

  for (const trackCfg of config.tracks) {
    // Tracks sans audio — pilotées uniquement par les timings SRT
    if (!trackCfg.src) {
      _loadSubtitlesThenRegister(trackCfg)
      continue
    }

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
  for (const { audio, cfg } of Object.values(store.tracks)) {
    if (audio && cfg.autoplay && !audio.isPlaying) audio.play()
  }
}

function _emitSubtitle(text, speaker) {
  const spk = speaker !== undefined ? speaker : subtitleState.activeSpeaker
  const choices = subtitleState.frozen ? subtitleState.choices : null
  const next = { text, speaker: spk ?? null, choices }
  if (
    next.text === subtitleState.current.text &&
    next.speaker === subtitleState.current.speaker &&
    next.choices === subtitleState.current.choices
  )
    return
  subtitleState.current = next
  subtitleState.listeners.forEach((fn) => fn(next))
}

function _tickSubtitles() {
  const id = subtitleState.activeId
  if (!id) return
  const track = _getAudioTrack(id)
  if (!track || !track.audio.isPlaying) {
    subtitleState.activeId = null
    subtitleState.activeSpeaker = null
    subtitleState.rafId = 0
    if (!subtitleState.frozen) _emitSubtitle('', null)
    return
  }
  const elapsed = (performance.now() - subtitleState.startedAt) / 1000
  const subs = track.cfg.subtitles || []
  const cueIdx = subs.findIndex((s) => elapsed >= s.from && elapsed < s.to)
  const cue = cueIdx >= 0 ? subs[cueIdx] : null

  if (cue && cueIdx === subs.length - 1 && !subtitleState.lastCueFired) {
    subtitleState.lastCueFired = true
    if (subtitleState.onLastCue) {
      subtitleState.frozen = true
      subtitleState.onLastCue()
    }
  }

  // When frozen and no active cue (silence after last cue), keep current text visible
  if (!cue && subtitleState.frozen) {
    subtitleState.rafId = requestAnimationFrame(_tickSubtitles)
    return
  }

  _emitSubtitle(cue ? cue.text : '')
  subtitleState.rafId = requestAnimationFrame(_tickSubtitles)
}

function _startSubtitles(id, onLastCue) {
  const track = store.tracks[id]
  if (!track) return
  const subs = track.cfg.subtitles
  if (!subs || subs.length === 0) return
  subtitleState.activeId = id
  subtitleState.activeSpeaker = track.cfg.speaker ?? null
  subtitleState.startedAt = performance.now()
  subtitleState.onLastCue = onLastCue ?? null
  subtitleState.lastCueFired = false
  if (!subtitleState.rafId) {
    subtitleState.rafId = requestAnimationFrame(_tickSubtitles)
  }
}

export function subscribeSubtitles(fn) {
  subtitleState.listeners.add(fn)
  fn({ ...subtitleState.current })
  return () => subtitleState.listeners.delete(fn)
}

// Set choices to display in the subtitle bar (called from UI when a branching dialogue starts).
// Choices are automatically cleared when the next dialogue starts.
export function setSubtitleChoices(choices) {
  subtitleState.choices = choices ?? null
  const next = { ...subtitleState.current, choices: subtitleState.choices }
  subtitleState.current = next
  subtitleState.listeners.forEach((fn) => fn(next))
}

// Affiche du texte dans la zone dialogue sans audio.
// duration > 0 : disparaît automatiquement après N ms.
// duration = 0 : reste affiché jusqu'au prochain appel.
export function showDialog(text, duration = 0) {
  _stopCurrentDialogue()
  _emitSubtitle(text)

  if (duration > 0) {
    subtitleState.hideTimeoutId = setTimeout(() => {
      subtitleState.hideTimeoutId = 0
      _emitSubtitle('')
    }, duration)
  }
}

export function hideDialog() {
  _stopCurrentDialogue()
  _emitSubtitle('')
}

// Prevent the subtitle from clearing when audio ends — useful when choices appear right after.
// Automatically released when the next dialogue starts or hideDialog() is called.
export function holdSubtitle() {
  subtitleState.frozen = true
}

// Joue un dialogue par son id (déclaré dans audioConfig.json).
// Si la track a un src audio : joue l'audio + sous-titres RAF.
// Sinon : pilote l'affichage directement via les timings SRT.
export function playDialogue(id, { onDone, onLastCue } = {}) {
  _whenReady(id, () => {
    _stopCurrentDialogue()
    _duckAmbiance()
    const track = _getTrack(id)
    if (!track) {
      _unduckAmbiance()
      onDone?.()
      return
    }

    const wrappedOnDone = onDone
      ? () => {
          _unduckAmbiance()
          onDone()
        }
      : _unduckAmbiance

    const cues = track.cfg.subtitles

    if (track.audio) {
      const prev = track.audio.onEnded
      track.audio.onEnded = function () {
        _runPreviousOnEnded(prev, this)
        track.audio.onEnded = prev
        wrappedOnDone()
      }
      _resumeContext()
      if (track.audio.isPlaying) track.audio.stop()
      track.audio.play()
      _startSubtitles(id, onLastCue)
      return
    }

    // Text-only : setTimeout calés sur les timings SRT
    if (!cues || cues.length === 0) {
      wrappedOnDone()
      return
    }

    const speaker = track.cfg.speaker ?? null
    cues.forEach((cue) => {
      subtitleState.textTimers.push(
        setTimeout(() => _emitSubtitle(cue.text, speaker), cue.from * 1000)
      )
      subtitleState.textTimers.push(setTimeout(() => _emitSubtitle('', null), cue.to * 1000))
    })

    subtitleState.textTimers.push(setTimeout(wrappedOnDone, cues[cues.length - 1].to * 1000))
  })
}

export function stopDialogue() {
  _stopCurrentDialogue()
  _unduckAmbiance()
  _emitSubtitle('')
}

export function play(id) {
  _whenReady(id, () => {
    const track = _getAudioTrack(id)
    if (!track) return

    _resumeContext()
    const { audio } = track
    if (!audio.isPlaying) audio.play()
    _startSubtitles(id)
  })
}

export function playOnce(id) {
  _whenReady(id, () => {
    const track = _getAudioTrack(id)
    if (!track) return

    _resumeContext()
    const { audio } = track
    if (audio.isPlaying) audio.stop()
    audio.play()
    _startSubtitles(id)
  })
}

export function stop(id) {
  _clearFadeTimeout(id)
  const track = _getAudioTrack(id)
  if (!track || !track.audio.isPlaying) return
  track.audio.stop()
}

// Ambiance manager — one looping ambiance at a time with smooth crossfade.
// Pass null to fade out the current ambiance without starting a new one.
const AMBIANCE_FADE_MS = 1500
let _currentAmbiance = null

// Duck the current ambiance during dialogue so speech is clearly audible.
const DIALOGUE_DUCK_VOLUME = 0.12
const DIALOGUE_DUCK_FADE_MS = 500
let _preDialogueAmbianceVolume = null

function _duckAmbiance() {
  if (!_currentAmbiance) return
  const track = _getTrack(_currentAmbiance)
  if (!track) return
  if (_preDialogueAmbianceVolume === null) _preDialogueAmbianceVolume = track.cfg.volume
  fade(_currentAmbiance, Math.min(track.cfg.volume, DIALOGUE_DUCK_VOLUME), DIALOGUE_DUCK_FADE_MS)
}

function _unduckAmbiance() {
  if (_preDialogueAmbianceVolume === null) return
  const vol = _preDialogueAmbianceVolume
  _preDialogueAmbianceVolume = null
  if (_currentAmbiance) fade(_currentAmbiance, vol, DIALOGUE_DUCK_FADE_MS)
}

export function setAmbiance(id, fadeDuration = AMBIANCE_FADE_MS) {
  if (_currentAmbiance === id) return
  if (_currentAmbiance) fade(_currentAmbiance, 0, fadeDuration)
  _currentAmbiance = id
  if (id) fade(id, store.tracks[id]?.cfg.volume ?? 0.7, fadeDuration)
}

export function stopAmbiance() {
  if (_currentAmbiance) stop(_currentAmbiance)
  _currentAmbiance = null
}

export function stopAll() {
  for (const [id, track] of Object.entries(store.tracks)) {
    _clearFadeTimeout(id)
    if (track.audio?.isPlaying) track.audio.stop()
  }
}

function _playAndWait(audio, id) {
  return new Promise((resolve) => {
    _resumeContext()
    if (audio.isPlaying) audio.stop()
    const prev = audio.onEnded
    audio.onEnded = function () {
      _runPreviousOnEnded(prev, this)
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
        const track = _getAudioTrack(id)
        if (!track) {
          resolve()
          return
        }

        const { audio, cfg } = track
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
    const track = _getAudioTrack(id)
    if (!track) return

    _resumeContext()
    const { audio, cfg } = track
    const ctx = audio.context
    const gain = audio.gain.gain
    const target = to * store.globalVolume
    const now = ctx.currentTime
    const end = now + duration / 1000

    gain.cancelScheduledValues(now)

    if (!audio.isPlaying && to > 0) {
      // Start from silence so the fade-in is audible
      gain.setValueAtTime(0, now)
      audio.play()
    } else {
      gain.setValueAtTime(gain.value, now)
    }

    gain.linearRampToValueAtTime(target, end)

    cfg.volume = to
    _clearFadeTimeout(id)

    if (to === 0) {
      const timeoutId = setTimeout(() => {
        store.fadeTimeouts.delete(id)
        if (audio.isPlaying) audio.stop()
      }, duration)
      store.fadeTimeouts.set(id, timeoutId)
    }
  })
}

export function setTrackVolume(id, volume) {
  const track = _getTrack(id)
  if (!track) return
  track.cfg.volume = volume
  track.audio?.setVolume(volume * store.globalVolume)
}

export function setGlobalVolume(volume) {
  store.globalVolume = volume
  for (const { audio, cfg } of Object.values(store.tracks)) {
    audio?.setVolume(cfg.volume * volume)
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
