import { useState, useCallback, useEffect, useRef } from 'react'
import Scene from './core/Scene'
import { PerfMonitor } from './core/PerfMonitor'
import Subtitles from './core/audio/Subtitles'
import { showDialog, hideDialog } from './utils/audioStore'
import './App.css'

const DIALOGUE_1 = [
  'Ohhh mais bienvenue à toi ! Bienvenue dans la Cabane !',
  'Tu es nouveau toi ici, je suis bien heureux de te recevoir !',
  "J'ai hâte de te présenter le concept de La Cabane et son fonctionnement.",
  'Ne sois pas timide, présente toi rapidement.',
]

const DIALOGUE_2 = [
  "Parfait ! Je vais pouvoir commencer la visite, j'espère que tu as hâte toi aussi.",
  "La Cabane c'est un espace de vie partagé au service du savoir commun.",
  'Ici tout le monde peut apprendre et faire apprendre, échanger, partager et recevoir.',
  "C'est un modèle novateur qui brise la transmission descendante du savoir.",
  "Ici peu importe l'âge, le métier, les origines, nous avons tous quelque chose à apprendre.",
  "J'ai entendu dire que tu as beaucoup hésité à venir, je comprends que cela peut sembler intimidant.",
  "Commençons par l'accueil.",
]

const MARIE_DIALOGUE = [
  'Bonjour et bienvenue ! Je suis Marie.',
  "N'hésite pas si tu as des questions sur La Cabane.",
]

const THOMAS_DIALOGUE = [
  "Salut ! Moi c'est Thomas.",
  'Je suis là pour te présenter les ateliers disponibles.',
]

const MARIE_CLIPS = [
  'Armature|mixamo.com|Layer0',
  'marie-sitting-idle',
  'marie-standiing-idle',
  'marie-standingup',
]

const THOMAS_CLIPS = ['thomas-back', 'thomas-front', 'thomas-turn']

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
          aria-label="Ton prénom"
          placeholder="Ton prénom…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && name.trim() && onSubmit(name.trim())}
          autoFocus
        />
        <button
          type="button"
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
      <button
        type="button"
        className="dev-section-header"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="dev-section-arrow" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
        {title}
      </button>
      {open && <div className="dev-section-body">{children}</div>}
    </div>
  )
}

const STATS_INIT = { fps: 0, frameMs: 0, calls: 0, triangles: 0, geometries: 0, textures: 0 }

function CharacterAnimationControls({ title, activeClip, clips, onSelect }) {
  return (
    <DevSection title={title}>
      {clips.map((clip) => (
        <button
          key={clip}
          type="button"
          className={`camera-toggle${activeClip === clip ? ' camera-toggle--active' : ''}`}
          aria-pressed={activeClip === clip}
          onClick={() => onSelect(clip)}
        >
          {clip}
        </button>
      ))}
    </DevSection>
  )
}

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
  const [marieClip, setMarieClip] = useState('marie-standiing-idle')
  const [thomasClip, setThomasClip] = useState('thomas-front')
  const [npcHovered, setNpcHovered] = useState(false)
  const [dialogueActive, setDialogueActive] = useState(false)
  const [introMovementLocked, setIntroMovementLocked] = useState(false)
  const dialogTimers = useRef([])
  const ignoreNextPointerUnlockRef = useRef(false)
  const sceneReady = status === 'ok'

  function clearDialogTimers() {
    dialogTimers.current.forEach(clearTimeout)
    dialogTimers.current = []
  }

  const exitIntro = useCallback(() => {
    setIntroActive(false)
    setIntroPending(false)
    setPostIntro(false)
    setShowNameInput(false)
    setIntroDoorOpen(false)
    setIntroWaitingAtDoor(false)
    setIntroShouldAdvance(false)
    setDialogueActive(false)
    setIntroMovementLocked(false)
    ignoreNextPointerUnlockRef.current = false
    clearDialogTimers()
    hideDialog()
  }, [])

  function playDialogue(lines, { msPerLine = 3800, onDone } = {}) {
    setDialogueActive(true)
    clearDialogTimers()
    playLines(lines, {
      msPerLine,
      timers: dialogTimers.current,
      onDone: () => {
        setDialogueActive(false)
        onDone?.()
      },
    })
  }

  // ESC → exit any intro state; F1 → toggle UI
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'F1') {
        e.preventDefault()
        setShowUI((v) => !v)
      }
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
      else if (ignoreNextPointerUnlockRef.current) {
        ignoreNextPointerUnlockRef.current = false
      } else if (wasLocked) {
        exitIntro()
      }
    }
    document.addEventListener('pointerlockchange', onChange)
    return () => document.removeEventListener('pointerlockchange', onChange)
  }, [postIntro, exitIntro])

  // Hide cursor during cinematic movement, show it when waiting at door
  useEffect(() => {
    const hide = introActive && !introWaitingAtDoor
    document.body.style.cursor = hide ? 'none' : ''
    return () => {
      document.body.style.cursor = ''
    }
  }, [introActive, introWaitingAtDoor])

  // Unlock pointer and freeze camera when name input appears
  useEffect(() => {
    if (showNameInput && document.pointerLockElement) {
      ignoreNextPointerUnlockRef.current = true
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
    if (event === 'wait:door') setIntroWaitingAtDoor(true)
    if (event === 'door:clicked') {
      setIntroWaitingAtDoor(false)
      setIntroShouldAdvance(true)
    }
    if (event === 'door:open') setIntroDoorOpen(true)
    if (event === 'inside') {
      setIntroDoorOpen(false)
      setIntroShouldAdvance(false)
      setIntroActive(false)
      setPostIntro(true)
      setIntroMovementLocked(true)
      playDialogue(DIALOGUE_1, {
        msPerLine: 3800,
        onDone: () => setShowNameInput(true),
      })
    }
  }

  function handleNpcInteract(id) {
    if (dialogueActive || introMovementLocked || showNameInput) return

    const lines = id === 'marie' ? MARIE_DIALOGUE : THOMAS_DIALOGUE
    playDialogue(lines, { msPerLine: 3800 })
  }

  function handleNameSubmit() {
    setShowNameInput(false)
    setIntroMovementLocked(true)
    playDialogue(DIALOGUE_2, {
      msPerLine: 4200,
      onDone: () => setIntroMovementLocked(false),
    })
  }

  function launchIntro() {
    if (!sceneReady) return
    setPostIntro(false)
    setShowNameInput(false)
    ignoreNextPointerUnlockRef.current = false
    setIntroPending(true)
  }

  function handleLoaderClick() {
    if (!sceneReady || loaderFading) return
    // Start the cinematic immediately so it plays under the fading loader.
    setIntroDoorOpen(false)
    setIntroWaitingAtDoor(false)
    setIntroShouldAdvance(false)
    setIntroActive(true)
    setLoaderFading(true)
  }

  function handleLoaderKeyDown(event) {
    if (loaderFading || (event.key !== 'Enter' && event.key !== ' ')) return
    event.preventDefault()
    handleLoaderClick()
  }

  function dismissLoader() {
    // Called when fade-out ends — just unmount the loader.
    setLoaderFading(false)
    setIntroPending(false)
  }

  return (
    <main className="viewer-page">
      <Subtitles />

      {(playerMode || postIntro) && !showNameInput && (
        <div className={`crosshair${npcHovered ? ' crosshair--active' : ''}`} aria-hidden="true">
          <div className="crosshair-ring" />
          <div className="crosshair-dot" />
        </div>
      )}

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
        movementLocked={introMovementLocked}
        interactionLocked={dialogueActive || introMovementLocked || showNameInput}
        onIntroEvent={handleIntroEvent}
        marieClip={marieClip}
        thomasClip={thomasClip}
        onNpcInteract={handleNpcInteract}
        onNpcHover={setNpcHovered}
      />

      {import.meta.env.DEV && showUI && <PerfMonitor stats={stats} scene={info} status={status} />}

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
            type="button"
            className="camera-toggle"
            onClick={launchIntro}
            disabled={!sceneReady || introPending || introActive}
          >
            <span className="camera-toggle-icon" aria-hidden="true">
              ▶
            </span>
            {!sceneReady
              ? 'Scène en chargement…'
              : introActive
                ? 'Intro en cours…'
                : introPending
                  ? 'En attente…'
                  : "Lancer l'histoire"}
          </button>

          <div className="controls-divider" />

          <button
            type="button"
            className={`camera-toggle${playerMode ? ' camera-toggle--active' : ''}`}
            aria-pressed={playerMode}
            onClick={() => {
              setPlayerMode((p) => !p)
              setPostIntro(false)
            }}
          >
            <span className="camera-toggle-icon" aria-hidden="true">
              {playerMode ? '🎮' : '🔭'}
            </span>
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
              <CharacterAnimationControls
                title="Marie"
                activeClip={marieClip}
                clips={MARIE_CLIPS}
                onSelect={setMarieClip}
              />
              <CharacterAnimationControls
                title="Thomas"
                activeClip={thomasClip}
                clips={THOMAS_CLIPS}
                onSelect={setThomasClip}
              />
              <DevSection title="Scène">
                <button
                  type="button"
                  className={`camera-toggle${debugDoors ? ' camera-toggle--active' : ''}`}
                  aria-pressed={debugDoors}
                  onClick={() => setDebugDoors((p) => !p)}
                >
                  <span className="camera-toggle-icon" aria-hidden="true">
                    {debugDoors ? '🟢' : '⚫'}
                  </span>
                  Debug portes
                </button>
                <button
                  type="button"
                  className={`camera-toggle${debugCollisions ? ' camera-toggle--active' : ''}`}
                  aria-pressed={debugCollisions}
                  onClick={() => setDebugCollisions((p) => !p)}
                >
                  <span className="camera-toggle-icon" aria-hidden="true">
                    {debugCollisions ? '🟢' : '⚫'}
                  </span>
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
          role="button"
          tabIndex={loaderFading ? -1 : 0}
          aria-label="Commencer l'introduction"
          onClick={!loaderFading ? handleLoaderClick : undefined}
          onKeyDown={handleLoaderKeyDown}
          onAnimationEnd={loaderFading ? dismissLoader : undefined}
        >
          <p className="intro-loader-hint">Cliquer pour commencer</p>
        </div>
      )}
    </main>
  )
}
