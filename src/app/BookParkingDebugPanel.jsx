import { useCallback, useEffect, useRef, useState } from 'react'

const PIECE_NAMES = ['img01', 'img02', 'img03', 'img04']

const DEFAULT_POSITIONS = [
  { x: -0.09, y: 0.015, z: 0.16 },
  { x: -0.03, y: 0.015, z: 0.16 },
  { x: 0.03, y: 0.015, z: 0.16 },
  { x: 0.09, y: 0.015, z: 0.16 },
]

const S = {
  shell: {
    position: 'fixed',
    bottom: 20,
    right: 20,
    zIndex: 900,
    width: 340,
    background: 'rgba(7, 9, 13, 0.96)',
    color: '#f4f7fb',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 14,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
    userSelect: 'none',
  },
  title: { fontSize: 13, fontWeight: 800, color: '#9de3ff', marginBottom: 12 },
  row: {
    display: 'grid',
    gridTemplateColumns: '40px 1fr 1fr 1fr',
    gap: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  label: { color: '#8e99a8', fontSize: 10, fontWeight: 800 },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6,
    background: 'rgba(255,255,255,0.055)',
    color: '#fff',
    padding: '5px 7px',
    outline: 'none',
    font: 'inherit',
    fontSize: 11,
    cursor: 'text',
  },
  btnRow: { display: 'flex', gap: 7, marginTop: 10 },
  btn: (tone) => ({
    border: 'none',
    borderRadius: 8,
    padding: '7px 10px',
    background: tone === 'primary' ? '#1673a8' : '#334055',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 800,
    fontSize: 11,
  }),
  copied: { color: '#7cffb2', fontSize: 11, alignSelf: 'center' },
}

function stopNative(e) {
  e.stopPropagation()
  e.nativeEvent?.stopImmediatePropagation()
}

export function BookParkingDebugPanel() {
  const shellRef = useRef(null)
  const [positions, setPositions] = useState(DEFAULT_POSITIONS)
  const [copied, setCopied] = useState(false)

  // Stop events from bubbling to document-level handlers (JournalBook puzzle drag, etc.)
  // Using bubble phase so child inputs still receive the events first.
  useEffect(() => {
    const el = shellRef.current
    if (!el) return
    const stop = (e) => e.stopPropagation()
    el.addEventListener('pointerdown', stop, false)
    el.addEventListener('pointerup', stop, false)
    el.addEventListener('pointermove', stop, false)
    return () => {
      el.removeEventListener('pointerdown', stop, false)
      el.removeEventListener('pointerup', stop, false)
      el.removeEventListener('pointermove', stop, false)
    }
  }, [])

  const handleChange = useCallback((index, axis, rawValue) => {
    const value = parseFloat(rawValue)
    if (isNaN(value)) return
    setPositions((prev) => {
      const next = prev.map((p, i) => (i === index ? { ...p, [axis]: value } : p))
      window.__bookDebug__?.setPos(index, next[index].x, next[index].y, next[index].z)
      return next
    })
  }, [])

  const handleCopy = useCallback(() => {
    const lines = positions.map((p) => `  new THREE.Vector3(${p.x}, ${p.y}, ${p.z}),`).join('\n')
    navigator.clipboard.writeText(`const PARKING_POSITIONS = [\n${lines}\n]`).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [positions])

  const handleReset = useCallback(() => {
    setPositions(DEFAULT_POSITIONS)
    DEFAULT_POSITIONS.forEach((p, i) => {
      window.__bookDebug__?.setPos(i, p.x, p.y, p.z)
    })
  }, [])

  return (
    <div ref={shellRef} style={S.shell} onPointerDown={stopNative}>
      <div style={S.title}>Livre — positions puzzle</div>
      {PIECE_NAMES.map((name, i) => (
        <div key={name} style={S.row}>
          <span style={S.label}>{name}</span>
          {['x', 'y', 'z'].map((axis) => (
            <input
              key={axis}
              type="number"
              step="0.001"
              style={S.input}
              value={positions[i][axis]}
              onChange={(e) => handleChange(i, axis, e.target.value)}
            />
          ))}
        </div>
      ))}
      <div style={S.btnRow}>
        <button style={S.btn('primary')} onClick={handleCopy}>
          Copier le code
        </button>
        <button style={S.btn()} onClick={handleReset}>
          Reset
        </button>
        {copied && <span style={S.copied}>Copié !</span>}
      </div>
    </div>
  )
}
