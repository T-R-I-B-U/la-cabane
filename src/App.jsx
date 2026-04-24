import { useState, useCallback, useEffect } from 'react'
import Scene from './core/Scene'
import { PerfMonitor } from './core/PerfMonitor'
import Subtitles from './core/audio/Subtitles'
import { showDialog, hideDialog } from './utils/audioStore'
import './App.css'

const TEST_LINES = [
  "Bienvenue dans la cabane.",
  "Elle vit au rythme de la forêt.",
  "Chaque objet ici a une histoire.",
]

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

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'F1') {
        e.preventDefault()
        setShowUI((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onReady = useCallback((data) => {
    setInfo(data)
    setStatus('ok')
  }, [])
  const onError = useCallback((msg) => {
    setInfo(msg)
    setStatus('error')
  }, [])

  function handleIntroEvent(event) {
    if (event === 'door:open') setIntroDoorOpen(true)
    if (event === 'inside') setIntroActive(false)
  }

  function launchIntro() {
    setIntroDoorOpen(false)
    setIntroActive(true)
  }

  function triggerTestSequence() {
    let t = 0
    TEST_LINES.forEach((line) => {
      setTimeout(() => showDialog(line, 2800), t)
      t += 3200
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
        onIntroEvent={handleIntroEvent}
      />

      {import.meta.env.DEV && showUI && <PerfMonitor stats={stats} scene={info} status={status} />}

      {showUI && (
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
            disabled={introActive}
          >
            <span className="camera-toggle-icon">▶</span>
            {introActive ? 'Intro en cours…' : 'Lancer l\'histoire'}
          </button>

          <div className="controls-divider" />

          <button
            className={`camera-toggle${playerMode ? ' camera-toggle--active' : ''}`}
            onClick={() => setPlayerMode((p) => !p)}
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
              <div className="controls-divider" />
              <button
                className="camera-toggle"
                onClick={triggerTestSequence}
              >
                <span className="camera-toggle-icon">💬</span>
                Test dialogue
              </button>
              <button
                className="camera-toggle"
                onClick={() => hideDialog()}
              >
                <span className="camera-toggle-icon">✖</span>
                Masquer dialogue
              </button>
            </>
          )}
        </aside>
      )}
    </main>
  )
}
