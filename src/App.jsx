import { useState, useCallback } from 'react'
import Scene from './core/Scene'
import { PerfMonitor } from './core/PerfMonitor'
import './App.css'

const STATS_INIT = { fps: 0, calls: 0, triangles: 0, geometries: 0, textures: 0 }

export default function App() {
  const [stats, setStats] = useState(STATS_INIT)
  const [status, setStatus] = useState('loading')
  const [info, setInfo] = useState(null)

  const onReady = useCallback((data) => {
    setInfo(data)
    setStatus('ok')
  }, [])

  const onError = useCallback((msg) => {
    setInfo(msg)
    setStatus('error')
  }, [])

  return (
    <main className="viewer-page">
      <Scene onStats={setStats} onReady={onReady} onError={onError} />

      {import.meta.env.DEV && <PerfMonitor stats={stats} />}

      <aside className="viewer-controls" aria-live="polite">
        <h1 className="controls-title">La Cabane</h1>

        {status === 'loading' && (
          <p className="controls-status">Construction de la scène…</p>
        )}

        {status === 'error' && (
          <p className="controls-error">{info}</p>
        )}

        {status === 'ok' && info && (
          <>
            <p className="controls-stat">
              <span className="dot dot--mesh" />
              {info.meshes} mesh{info.meshes !== 1 ? 'es' : ''} chargé{info.meshes !== 1 ? 's' : ''}
            </p>
            <p className="controls-stat">
              <span className="dot dot--pivot" />
              {info.pivots} pivot{info.pivots !== 1 ? 's' : ''} (assets manquants)
            </p>
          </>
        )}
      </aside>
    </main>
  )
}
