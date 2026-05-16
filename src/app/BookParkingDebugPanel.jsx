import { useCallback, useEffect, useState } from 'react'

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
    width: 300,
    background: 'rgba(7, 9, 13, 0.96)',
    color: '#f4f7fb',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 14,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
    userSelect: 'none',
    pointerEvents: 'none',
  },
  title: { fontSize: 13, fontWeight: 800, color: '#9de3ff', marginBottom: 4 },
  hint: { color: '#8e99a8', fontSize: 10, marginBottom: 12 },
  row: {
    display: 'grid',
    gridTemplateColumns: '40px 1fr 1fr 1fr',
    gap: 6,
    alignItems: 'center',
    marginBottom: 6,
  },
  label: { color: '#8e99a8', fontSize: 10, fontWeight: 800 },
  val: {
    background: 'rgba(255,255,255,0.055)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 6,
    padding: '5px 7px',
    fontSize: 11,
    color: '#fff',
    textAlign: 'right',
  },
  btnRow: { display: 'flex', gap: 7, marginTop: 10, pointerEvents: 'auto' },
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

function fmt(n) {
  return n.toFixed(4)
}

export function BookParkingDebugPanel() {
  const [positions, setPositions] = useState(DEFAULT_POSITIONS)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const sync = () => {
      const pos = window.__bookDebug__?.getPos()
      if (!pos) return
      setPositions(pos.map((p) => ({ x: p.x, y: p.y, z: p.z })))
    }
    if (window.__bookDebug__) window.__bookDebug__.onPositionsUpdate = sync
    return () => {
      if (window.__bookDebug__) window.__bookDebug__.onPositionsUpdate = null
    }
  }, [])

  const handleCopy = useCallback(() => {
    const lines = positions
      .map((p) => `  new THREE.Vector3(${fmt(p.x)}, ${fmt(p.y)}, ${fmt(p.z)}),`)
      .join('\n')
    navigator.clipboard.writeText(`const PARKING_POSITIONS = [\n${lines}\n]`).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [positions])

  const handleReset = useCallback(() => {
    DEFAULT_POSITIONS.forEach((p, i) => {
      window.__bookDebug__?.setPos(i, p.x, p.y, p.z)
    })
    setPositions(DEFAULT_POSITIONS)
  }, [])

  return (
    <div style={S.shell}>
      <div style={S.title}>Livre — positions puzzle</div>
      <div style={S.hint}>Glisse une pièce → Entrée pour sauver</div>
      {PIECE_NAMES.map((name, i) => (
        <div key={name} style={S.row}>
          <span style={S.label}>{name}</span>
          {['x', 'y', 'z'].map((axis) => (
            <div key={axis} style={S.val}>
              {fmt(positions[i][axis])}
            </div>
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
