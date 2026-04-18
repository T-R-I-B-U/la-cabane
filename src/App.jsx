import { useState, useCallback, useEffect } from 'react'
import Scene from './core/Scene'
import { PerfMonitor } from './core/PerfMonitor'
import './App.css'

const STATS_INIT = { fps: 0, frameMs: 0, calls: 0, triangles: 0, geometries: 0, textures: 0 }

export default function App() {
  const [stats, setStats] = useState(STATS_INIT)
  const [status, setStatus] = useState('loading')
  const [info, setInfo] = useState(null)
  const [playerMode, setPlayerMode] = useState(false)
  const [debugDoors, setDebugDoors] = useState(false)
  const [showUI, setShowUI] = useState(true)

  useEffect(() => {
    const onKey = (e) => { if (e.code === 'F1') { e.preventDefault(); setShowUI(v => !v) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onReady = useCallback((data) => { setInfo(data); setStatus('ok') }, [])
  const onError = useCallback((msg) => { setInfo(msg); setStatus('error') }, [])

  return (
    <main className="viewer-page">
      <Scene onStats={setStats} onReady={onReady} onError={onError} playerMode={playerMode} debugDoors={debugDoors} />

      {import.meta.env.DEV && showUI && <PerfMonitor stats={stats} scene={info} status={status} />}

      {showUI && <aside className="viewer-controls" aria-live="polite">
        <h1 className="controls-title">La Cabane</h1>

        <div className="controls-divider" />

        {status === 'loading' && <p className="controls-status">Construction de la scène…</p>}
        {status === 'error'   && <p className="controls-error">{info}</p>}
        {status === 'ok' && info && (
          <>
            <p className="controls-stat">
              <span className="dot dot--mesh" />{info.meshes} mesh{info.meshes !== 1 ? 'es' : ''}
            </p>
            <p className="controls-stat">
              <span className="dot dot--pivot" />{info.pivots} pivot{info.pivots !== 1 ? 's' : ''} manquants
            </p>
          </>
        )}

        <div className="controls-divider" />

        <button
          className={`camera-toggle${playerMode ? ' camera-toggle--active' : ''}`}
          onClick={() => setPlayerMode((p) => !p)}
        >
          <span className="camera-toggle-icon">{playerMode ? '🎮' : '🔭'}</span>
          {playerMode ? 'Mode joueur' : 'Mode orbite'}
        </button>

        {playerMode && (
          <p className="controls-hint">Clic pour capturer · WASD pour avancer · ESC pour quitter</p>
        )}

        {import.meta.env.DEV && (
          <>
            <div className="controls-divider" />
            <button
              className={`camera-toggle${debugDoors ? ' camera-toggle--active' : ''}`}
              onClick={() => setDebugDoors(p => !p)}
            >
              <span className="camera-toggle-icon">{debugDoors ? '🟢' : '⚫'}</span>
              Debug portes
            </button>
          </>
        )}
      </aside>}
    </main>
  )
}
