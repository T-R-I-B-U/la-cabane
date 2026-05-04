import { useState } from 'react'

const LABELS = [
  'Vue extérieure (départ)',
  'Approche porte',
  'Devant la porte',
  "Porte s'ouvre",
  'Intérieur (arrivée)',
]

const EMPTY = () => ({ position: null, target: null })

function fmt(v) {
  if (!v) return '—'
  return `${v.x}, ${v.y}, ${v.z}`
}

function CoordRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 12 }}>
      <span style={{ color: '#aaa', minWidth: 52 }}>{label}</span>
      <span style={{ fontFamily: 'monospace', color: '#eee' }}>{fmt(value)}</span>
    </div>
  )
}

export default function IntroCameraPanel({ live, onCapture, waypoints }) {
  const [copied, setCopied] = useState(false)

  function copyJSON() {
    const out = waypoints.map((wp, i) => ({
      label: LABELS[i],
      position: wp.position ?? { x: 0, y: 0, z: 0 },
      target: wp.target ?? { x: 0, y: 0, z: 0 },
    }))
    navigator.clipboard.writeText(JSON.stringify(out, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const panel = {
    position: 'fixed',
    right: 16,
    top: 16,
    zIndex: 800,
    background: 'rgba(10,12,16,0.88)',
    backdropFilter: 'blur(8px)',
    color: '#fff',
    borderRadius: 8,
    padding: '14px 16px',
    width: 300,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    fontSize: 13,
    fontFamily: 'system-ui, sans-serif',
    boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
    userSelect: 'none',
  }

  return (
    <div style={panel}>
      <div style={{ fontWeight: 700, fontSize: 14, color: '#7cf', marginBottom: 2 }}>
        Éditeur waypoints caméra
      </div>

      {/* Position live */}
      <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 6, padding: '8px 10px' }}>
        <div style={{ color: '#aaa', fontSize: 11, marginBottom: 4 }}>CAMÉRA ACTUELLE</div>
        <CoordRow label="pos" value={live?.position} />
        <CoordRow label="target" value={live?.target} />
      </div>

      {/* Waypoints */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {LABELS.map((label, i) => {
          const wp = waypoints[i]
          const captured = wp.position !== null
          return (
            <div
              key={i}
              style={{
                background: captured ? 'rgba(120,220,140,0.08)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${captured ? 'rgba(120,220,140,0.3)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 6,
                padding: '8px 10px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 4,
                }}
              >
                <span style={{ fontSize: 11, color: captured ? '#8de' : '#888' }}>
                  WP{i} — {label}
                </span>
                <button
                  onClick={() => onCapture(i, live)}
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 4,
                    border: 'none',
                    background: '#2a6',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  Capturer
                </button>
              </div>
              {captured && (
                <>
                  <CoordRow label="pos" value={wp.position} />
                  <CoordRow label="target" value={wp.target} />
                </>
              )}
              {!captured && <span style={{ fontSize: 11, color: '#666' }}>non capturé</span>}
            </div>
          )
        })}
      </div>

      {/* Export */}
      <button
        onClick={copyJSON}
        style={{
          marginTop: 2,
          padding: '7px 0',
          borderRadius: 6,
          border: 'none',
          background: copied ? '#2a6' : '#335',
          color: '#fff',
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: 13,
          transition: 'background 200ms',
        }}
      >
        {copied ? '✓ Copié !' : 'Copier JSON'}
      </button>
    </div>
  )
}
