import { useEffect, useRef, useState, useCallback } from 'react'
import { CabaneEngine } from './core/CabaneEngine.js'
import { PerfMonitor } from './core/PerfMonitor.jsx'
import './App.css'

export default function App() {
  const containerRef = useRef(null)
  const engineRef    = useRef(null)

  const [stats,      setStats]      = useState({ fps: 0, cpu: 0, calls: 0, triangles: 0, geometries: 0, textures: 0 })
  const [status,     setStatus]     = useState('loading')
  const [info,       setInfo]       = useState(null)

  const [jsonText,    setJsonText]    = useState('')
  const [jsonError,   setJsonError]   = useState(null)
  const [overriding,  setOverriding]  = useState(false)
  const [dragging,    setDragging]    = useState(false)
  const [compressed,  setCompressed]  = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const engine = new CabaneEngine(container, {
      onStats: setStats,
      onReady: (data) => { setInfo(data); setStatus('ok') },
      onError: (msg)  => { setInfo(msg);  setStatus('error') },
    })
    engineRef.current = engine
    engine.setFloorY(0.8)

    return () => {
      engine.dispose()
      engineRef.current = null
    }
  }, [])

  const applyJson = useCallback((text) => {
    try {
      const data = JSON.parse(text)
      setJsonError(null)
      setOverriding(true)
      setStatus('loading')
      engineRef.current?.reload(data)
    } catch {
      setJsonError('JSON invalide')
    }
  }, [])

  const resetJson = useCallback(() => {
    setJsonText('')
    setJsonError(null)
    setOverriding(false)
    setStatus('loading')
    engineRef.current?.reload(null)
  }, [])

  const onPaste = useCallback((e) => {
    const text = e.clipboardData.getData('text')
    setJsonText(text)
    applyJson(text)
    e.preventDefault()
  }, [applyJson])

  const onDragOver = useCallback((e) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const onDragLeave = useCallback(() => setDragging(false), [])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target.result
      setJsonText(text)
      applyJson(text)
    }
    reader.readAsText(file)
  }, [applyJson])

  return (
    <main className="viewer-page">
      <div ref={containerRef} className="viewer-canvas" />

      <PerfMonitor stats={stats} />

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
              {info.pivots} pivot{info.pivots !== 1 ? 's' : ''}
            </p>
          </>
        )}

        {/* ── Mode assets ── */}
        <div className="asset-mode">
          <span className="asset-mode-label">Assets</span>
          <button
            className={`asset-toggle${compressed ? ' asset-toggle--on' : ''}`}
            onClick={() => {
              const next = !compressed
              setCompressed(next)
              engineRef.current?.setCompressed(next)
            }}
          >
            <span className="asset-toggle-track">
              <span className="asset-toggle-thumb" />
            </span>
            <span className="asset-toggle-label">{compressed ? 'compressés' : 'normaux'}</span>
          </button>
        </div>

        {/* ── JSON override ── */}
        <div className="json-section">
          <div className="json-header">
            <span className="json-label">
              JSON{overriding && <span className="json-badge">override</span>}
            </span>
            {overriding && (
              <button className="json-reset" onClick={resetJson}>Réinitialiser</button>
            )}
          </div>

          <div
            className={`json-dropzone${dragging ? ' json-dropzone--over' : ''}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <textarea
              className="json-textarea"
              placeholder="Coller un JSON ou déposer un fichier .json ici…"
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              onPaste={onPaste}
              spellCheck={false}
            />
          </div>

          {jsonError && <p className="json-error">{jsonError}</p>}

          {jsonText && !overriding && !jsonError && (
            <button className="json-apply" onClick={() => applyJson(jsonText)}>
              Appliquer
            </button>
          )}
        </div>
      </aside>
    </main>
  )
}
