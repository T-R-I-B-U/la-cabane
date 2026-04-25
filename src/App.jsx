import { useState, useCallback, useEffect, useRef } from 'react'
import Scene from './core/Scene'
import { PerfMonitor } from './core/PerfMonitor'
import Subtitles from './core/audio/Subtitles'
import IntroCameraPanel from './core/IntroCameraPanel'
import { showDialog, hideDialog } from './utils/audioStore'
import './App.css'

const TEST_LINES = [
  "Ohhh mais bienvenue à toi ! Bienvenue dans la Cabane !",
  "Tu es nouveau toi ici, je suis bien heureux de te recevoir !",
]

const DIALOGUE_1 = [
  "Ohhh mais bienvenue à toi ! Bienvenue dans la Cabane !",
  "Tu es nouveau toi ici, je suis bien heureux de te recevoir !",
  "J'ai hâte de te présenter le concept de La Cabane et son fonctionnement.",
  "Ne sois pas timide, présente toi rapidement.",
]

const DIALOGUE_2 = [
  "Parfait ! Je vais pouvoir commencer la visite, j'espère que tu as hâte toi aussi.",
  "La Cabane c'est un espace de vie partagé au service du savoir commun.",
  "Ici tout le monde peut apprendre et faire apprendre, échanger, partager et recevoir.",
  "C'est un modèle novateur qui brise la transmission descendante du savoir.",
  "Ici peu importe l'âge, le métier, les origines, nous avons tous quelque chose à apprendre.",
  "J'ai entendu dire que tu as beaucoup hésité à venir, je comprends que cela peut sembler intimidant.",
  "Commençons par l'accueil.",
]

function playLines(lines, { msPerLine = 3800, onDone, timers } = {}) {
  let t = 0
  lines.forEach((line, i) => {
    const isLast = i === lines.length - 1
    const id = setTimeout(() => showDialog(line, isLast ? 2800 : 0), t)
    if (timers) timers.push(id)
    t += msPerLine
  })
  if (onDone) {
    const id = setTimeout(onDone, t)
    if (timers) timers.push(id)
  }
}

function NameInput({ onSubmit }) {
  const [name, setName] = useState('')
  return (
    <div className="name-input-overlay">
      <div className="name-input-card">
        <p className="name-input-label">Comment t'appelles-tu ?</p>
        <input
          className="name-input-field"
          type="text"
          placeholder="Ton prénom…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && name.trim() && onSubmit(name.trim())}
          autoFocus
        />
        <button
          className="name-input-submit camera-toggle"
          onClick={() => name.trim() && onSubmit(name.trim())}
        >
          Continuer
        </button>
      </div>
    </div>
  )
}

function DevSection({ title, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="dev-section">
      <button className="dev-section-header" onClick={() => setOpen((o) => !o)}>
        <span className="dev-section-arrow">{open ? '▾' : '▸'}</span>
        {title}
      </button>
      {open && <div className="dev-section-body">{children}</div>}
    </div>
  )
}

const STATS_INIT = { fps: 0, frameMs: 0, calls: 0, triangles: 0, geometries: 0, textures: 0 }

export default function App() {
  const [stats, setStats] = useState(STATS_INIT)
  const [status, setStatus] = useState('loading')
  const [info, setInfo] = useState(null)
  const [playerMode, setPlayerMode] = useState(false)
  const [debugDoors, setDebugDoors] = useState(false)
  const [debugCollisions, setDebugCollisions] = useState(false)
  const [showUI, setShowUI] = useState(true)
  const [introActive, setIntroActive] = useState(false)
  const [introDoorOpen, setIntroDoorOpen] = useState(false)
  const [introWaitingAtDoor, setIntroWaitingAtDoor] = useState(false)
  const [introShouldAdvance, setIntroShouldAdvance] = useState(false)
  const [introPending, setIntroPending] = useState(false)
  const [postIntro, setPostIntro] = useState(false)
  const [showNameInput, setShowNameInput] = useState(false)
  const [loaderFading, setLoaderFading] = useState(false)
  const [debugCamera, setDebugCamera] = useState(false)
  const [liveCamera, setLiveCamera] = useState(null)
  const dialogTimers = useRef([])
  const [waypoints, setWaypoints] = useState([
    { position: null, target: null },
    { position: null, target: null },
    { position: null, target: null },
    { position: null, target: null },
  ])

  const exitIntro = useCallback(() => {
    setIntroActive(false)
    setIntroPending(false)
    setPostIntro(false)
    setShowNameInput(false)
    setIntroDoorOpen(false)
    setIntroWaitingAtDoor(false)
    setIntroShouldAdvance(false)
    dialogTimers.current.forEach(clearTimeout)
    dialogTimers.current = []
    hideDialog()
  }, [])

  // ESC → exit any intro state; F1 → toggle UI
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'F1') { e.preventDefault(); setShowUI((v) => !v) }
      if (e.code === 'Escape') exitIntro()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [exitIntro])

  // When pointer unlocks in postIntro (user pressed ESC while locked) → exit
  useEffect(() => {
    if (!postIntro) return
    let wasLocked = false
    const onChange = () => {
      if (document.pointerLockElement) wasLocked = true
      else if (wasLocked) exitIntro()
    }
    document.addEventListener('pointerlockchange', onChange)
    return () => document.removeEventListener('pointerlockchange', onChange)
  }, [postIntro, exitIntro])

  // Hide cursor during cinematic movement, show it when waiting at door
  useEffect(() => {
    const hide = introActive && !introWaitingAtDoor
    document.body.style.cursor = hide ? 'none' : ''
    return () => { document.body.style.cursor = '' }
  }, [introActive, introWaitingAtDoor])

  // Unlock pointer and freeze camera when name input appears
  useEffect(() => {
    if (showNameInput && document.pointerLockElement) {
      document.exitPointerLock()
    }
  }, [showNameInput])

  const onReady = useCallback((data) => {
    setInfo(data)
    setStatus('ok')
  }, [])
  const onError = useCallback((msg) => {
    setInfo(msg)
    setStatus('error')
  }, [])

  function handleIntroEvent(event) {
    console.log('[Intro event]', event)
    if (event === 'wait:door')    setIntroWaitingAtDoor(true)
    if (event === 'door:clicked') {
      setIntroWaitingAtDoor(false)
      setIntroShouldAdvance(true)
    }
    if (event === 'door:open')    setIntroDoorOpen(true)
    if (event === 'inside') {
      setIntroActive(false)
      setPostIntro(true)
      playLines(DIALOGUE_1, {
        msPerLine: 3800,
        timers: dialogTimers.current,
        onDone: () => setShowNameInput(true),
      })
    }
  }

  function captureWaypoint(index, live) {
    if (!live) return
    setWaypoints((prev) => {
      const next = [...prev]
      next[index] = { position: live.position, target: live.target }
      return next
    })
  }

  function handleNameSubmit(name) {
    setShowNameInput(false)
    playLines(DIALOGUE_2, { msPerLine: 4200, timers: dialogTimers.current })
    console.log('[Intro] nom du joueur:', name)
  }

  function launchIntro() {
    setPostIntro(false)
    setShowNameInput(false)
    setIntroPending(true)
  }

  function handleLoaderClick() {
    // Start the cinematic immediately so it plays under the fading loader.
    setIntroDoorOpen(false)
    setIntroWaitingAtDoor(false)
    setIntroShouldAdvance(false)
    setIntroActive(true)
    setLoaderFading(true)
  }

  function dismissLoader() {
    // Called when fade-out ends — just unmount the loader.
    setLoaderFading(false)
    setIntroPending(false)
  }

  function triggerTestSequence() {
    dialogTimers.current.forEach(clearTimeout)
    dialogTimers.current = []
    let t = 0
    TEST_LINES.forEach((line, i) => {
      const duration = i === TEST_LINES.length - 1 ? 3000 : 0
      const id = setTimeout(() => showDialog(line, duration), t)
      dialogTimers.current.push(id)
      t += 3400
    })
  }

  return (
    <main className="viewer-page">
      <Subtitles />
      <Scene
        onStats={setStats}
        onReady={onReady}
        onError={onError}
        playerMode={playerMode}
        debugDoors={debugDoors}
        debugCollisions={debugCollisions}
        introActive={introActive}
        introDoorOpen={introDoorOpen}
        introWaitingAtDoor={introWaitingAtDoor}
        introShouldAdvance={introShouldAdvance}
        postIntro={postIntro}
        postIntroLocked={!showNameInput}
        onIntroEvent={handleIntroEvent}
        onCameraChange={debugCamera ? setLiveCamera : null}
      />

      {import.meta.env.DEV && showUI && <PerfMonitor stats={stats} scene={info} status={status} />}
      {import.meta.env.DEV && debugCamera && (
        <IntroCameraPanel
          live={liveCamera}
          waypoints={waypoints}
          onCapture={captureWaypoint}
        />
      )}

      {showUI && !introPending && !introActive && !postIntro && (
        <aside className="viewer-controls" aria-live="polite">
          <h1 className="controls-title">La Cabane</h1>

          <div className="controls-divider" />

          {status === 'loading' && <p className="controls-status">Construction de la scène…</p>}
          {status === 'error' && <p className="controls-error">{info}</p>}
          {status === 'ok' && info && (
            <>
              <p className="controls-stat">
                <span className="dot dot--mesh" />
                {info.meshes} mesh{info.meshes !== 1 ? 'es' : ''}
              </p>
              <p className="controls-stat">
                <span className="dot dot--pivot" />
                {info.pivots} pivot{info.pivots !== 1 ? 's' : ''} manquants
              </p>
            </>
          )}

          <div className="controls-divider" />

          <button
            className="camera-toggle"
            onClick={launchIntro}
            disabled={introPending || introActive}
          >
            <span className="camera-toggle-icon">▶</span>
            {introActive ? 'Intro en cours…' : introPending ? 'En attente…' : 'Lancer l\'histoire'}
          </button>

          <div className="controls-divider" />

          <button
            className={`camera-toggle${playerMode ? ' camera-toggle--active' : ''}`}
            onClick={() => { setPlayerMode((p) => !p); setPostIntro(false) }}
          >
            <span className="camera-toggle-icon">{playerMode ? '🎮' : '🔭'}</span>
            {playerMode ? 'Mode joueur' : 'Mode orbite'}
          </button>

          {playerMode && (
            <p className="controls-hint">
              Clic pour capturer · WASD pour avancer · ESC pour quitter
            </p>
          )}

          {import.meta.env.DEV && (
            <>
              <div className="controls-divider" />
              <DevSection title="Caméra">
                <button
                  className={`camera-toggle${debugCamera ? ' camera-toggle--active' : ''}`}
                  onClick={() => setDebugCamera((p) => !p)}
                >
                  <span className="camera-toggle-icon">{debugCamera ? '🟢' : '⚫'}</span>
                  Éditeur waypoints
                </button>
              </DevSection>
              <DevSection title="Dialogue">
                <button className="camera-toggle" onClick={triggerTestSequence}>
                  <span className="camera-toggle-icon">💬</span>
                  Test dialogue
                </button>
              </DevSection>
              <DevSection title="Scène">
                <button
                  className={`camera-toggle${debugDoors ? ' camera-toggle--active' : ''}`}
                  onClick={() => setDebugDoors((p) => !p)}
                >
                  <span className="camera-toggle-icon">{debugDoors ? '🟢' : '⚫'}</span>
                  Debug portes
                </button>
                <button
                  className={`camera-toggle${debugCollisions ? ' camera-toggle--active' : ''}`}
                  onClick={() => setDebugCollisions((p) => !p)}
                >
                  <span className="camera-toggle-icon">{debugCollisions ? '🟢' : '⚫'}</span>
                  Debug collisions
                </button>
              </DevSection>
            </>
          )}
        </aside>
      )}

      {showNameInput && <NameInput onSubmit={handleNameSubmit} />}

      {introPending && (
        <div
          className={`intro-loader${loaderFading ? ' intro-loader--fading' : ''}`}
          onClick={!loaderFading ? handleLoaderClick : undefined}
          onAnimationEnd={loaderFading ? dismissLoader : undefined}
        >
          <p className="intro-loader-hint">Cliquer pour commencer</p>
        </div>
      )}
    </main>
  )
}
