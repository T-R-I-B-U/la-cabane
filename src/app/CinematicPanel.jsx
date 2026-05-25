import { useEffect, useRef, useState } from 'react'
import { getLiveCamera } from '../core/cameraRegistry'

const STORAGE_KEY = 'lacabane:cinematic-presets:v1'

function loadPresets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore
  }
  return [{ id: 'preset-1', name: 'Preset 1', keypoints: [] }]
}

function savePresets(presets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ presets }))
}

const S = {
  shell: {
    position: 'fixed',
    top: 20,
    left: 20,
    zIndex: 900,
    width: 420,
    background: 'rgba(7, 9, 13, 0.96)',
    color: '#f4f7fb',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 18px 60px rgba(0,0,0,0.45)',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
    userSelect: 'none',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    background: 'linear-gradient(90deg, rgba(46,124,173,0.22), rgba(255,255,255,0.03))',
    cursor: 'grab',
  },
  headerTitle: { fontWeight: 600, fontSize: 13 },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#f4f7fb',
    cursor: 'pointer',
    fontSize: 16,
    lineHeight: 1,
    padding: '0 2px',
  },
  tabsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '8px 14px 0',
    flexWrap: 'wrap',
  },
  tab: (active) => ({
    padding: '4px 10px',
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.15)',
    background: active ? 'rgba(46,124,173,0.4)' : 'rgba(255,255,255,0.05)',
    color: '#f4f7fb',
    cursor: 'pointer',
    fontSize: 11,
  }),
  addTabBtn: {
    padding: '4px 8px',
    borderRadius: 6,
    border: '1px dashed rgba(255,255,255,0.2)',
    background: 'none',
    color: 'rgba(255,255,255,0.4)',
    cursor: 'pointer',
    fontSize: 12,
  },
  body: { padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 },
  keypointRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 8px',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
  },
  posLabel: { flex: 1, fontSize: 10, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,80,80,0.7)',
    cursor: 'pointer',
    fontSize: 14,
    lineHeight: 1,
    padding: '0 2px',
  },
  captureBtn: {
    padding: '6px 12px',
    borderRadius: 8,
    border: '1px solid rgba(46,124,173,0.5)',
    background: 'rgba(46,124,173,0.15)',
    color: '#8bc5e8',
    cursor: 'pointer',
    fontSize: 11,
    width: '100%',
  },
  footer: {
    display: 'flex',
    gap: 6,
    padding: '0 14px 12px',
  },
  launchBtn: {
    flex: 1,
    padding: '7px 0',
    borderRadius: 8,
    border: 'none',
    background: 'rgba(80,180,80,0.8)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
  },
  exportBtn: {
    flex: 1,
    padding: '7px 0',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.05)',
    color: '#f4f7fb',
    cursor: 'pointer',
    fontSize: 12,
  },
  emptyHint: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    textAlign: 'center',
    padding: '8px 0',
  },
}

export function CinematicPanel({ onLaunch, onClose }) {
  const stored = loadPresets()
  const [presets, setPresets] = useState(stored.presets ?? stored)
  const [activeIdx, setActiveIdx] = useState(0)
  const shellRef = useRef(null)
  const dragRef = useRef(null)
  const posRef = useRef({ x: 20, y: 20 })

  useEffect(() => {
    savePresets(presets)
  }, [presets])

  // Drag logic
  function onHeaderMouseDown(e) {
    if (e.button !== 0) return
    const rect = shellRef.current.getBoundingClientRect()
    dragRef.current = { startX: e.clientX - rect.left, startY: e.clientY - rect.top }
    window.addEventListener('mousemove', onDragMove)
    window.addEventListener('mouseup', onDragUp)
  }
  function onDragMove(e) {
    if (!dragRef.current) return
    posRef.current = {
      x: e.clientX - dragRef.current.startX,
      y: e.clientY - dragRef.current.startY,
    }
    shellRef.current.style.left = posRef.current.x + 'px'
    shellRef.current.style.top = posRef.current.y + 'px'
  }
  function onDragUp() {
    dragRef.current = null
    window.removeEventListener('mousemove', onDragMove)
    window.removeEventListener('mouseup', onDragUp)
  }

  const activePreset = presets[activeIdx] ?? presets[0]

  function addPreset() {
    const n = presets.length + 1
    const next = [...presets, { id: `preset-${Date.now()}`, name: `Preset ${n}`, keypoints: [] }]
    setPresets(next)
    setActiveIdx(next.length - 1)
  }

  function captureKeypoint() {
    const cam = getLiveCamera()
    if (!cam) return
    const kp = { position: cam.position, target: cam.target, fov: cam.fov }
    setPresets((prev) =>
      prev.map((p, i) => (i === activeIdx ? { ...p, keypoints: [...p.keypoints, kp] } : p))
    )
  }

  function deleteKeypoint(kpIdx) {
    setPresets((prev) =>
      prev.map((p, i) =>
        i === activeIdx ? { ...p, keypoints: p.keypoints.filter((_, j) => j !== kpIdx) } : p
      )
    )
  }

  function handleLaunch() {
    if (!activePreset || activePreset.keypoints.length < 2) return
    onLaunch(activePreset.keypoints)
  }

  function handleExport() {
    const data = JSON.stringify({ presets }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cinematic-presets.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div ref={shellRef} style={S.shell}>
      <div style={S.header} onMouseDown={onHeaderMouseDown}>
        <span style={S.headerTitle}>Cinematic Camera</span>
        <button style={S.closeBtn} onClick={onClose}>
          ×
        </button>
      </div>

      <div style={S.tabsRow}>
        {presets.map((p, i) => (
          <button key={p.id} style={S.tab(i === activeIdx)} onClick={() => setActiveIdx(i)}>
            {p.name}
          </button>
        ))}
        <button style={S.addTabBtn} onClick={addPreset}>
          +
        </button>
      </div>

      <div style={S.body}>
        {activePreset.keypoints.length === 0 && (
          <p style={S.emptyHint}>Aucun keypoint — capture la vue actuelle ci-dessous</p>
        )}
        {activePreset.keypoints.map((kp, i) => (
          <div key={i} style={S.keypointRow}>
            <span style={S.posLabel}>
              {i + 1}. ({kp.position.x.toFixed(1)}, {kp.position.y.toFixed(1)},{' '}
              {kp.position.z.toFixed(1)})
            </span>
            <button style={S.deleteBtn} onClick={() => deleteKeypoint(i)}>
              ×
            </button>
          </div>
        ))}
        <button style={S.captureBtn} onClick={captureKeypoint}>
          + Capturer vue actuelle
        </button>
      </div>

      <div style={S.footer}>
        <button
          style={{ ...S.launchBtn, opacity: activePreset.keypoints.length < 2 ? 0.4 : 1 }}
          onClick={handleLaunch}
          disabled={activePreset.keypoints.length < 2}
        >
          ▶ Lancer
        </button>
        <button style={S.exportBtn} onClick={handleExport}>
          Exporter JSON
        </button>
      </div>
    </div>
  )
}
