import { useEffect, useRef, useState } from 'react'
import {
  addStoryPov,
  captureIntroWaypoint,
  captureStoryPov,
  exportAsJS,
  getLiveCamera,
  getRegistry,
  onLiveCameraChange,
  onRegistryChange,
  removeStoryPov,
  renameStoryPov,
  requestTeleport,
} from './cameraRegistry'

// ── Styles ───────────────────────────────────────────────────────────

const S = {
  panel: {
    position: 'fixed',
    right: 16,
    top: 16,
    zIndex: 800,
    width: 300,
    maxHeight: 'calc(100vh - 32px)',
    overflowY: 'auto',
    background: 'rgba(10,12,16,0.92)',
    backdropFilter: 'blur(8px)',
    color: '#fff',
    borderRadius: 10,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    fontSize: 12,
    fontFamily: 'system-ui, sans-serif',
    boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
    userSelect: 'none',
  },
  heading: { fontWeight: 700, fontSize: 13, color: '#7cf', marginBottom: 2 },
  section: { display: 'flex', flexDirection: 'column', gap: 6 },
  eyebrow: {
    color: '#666',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  liveBox: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 6,
    padding: '7px 10px',
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#ccc',
    lineHeight: 1.6,
  },
  slot: (captured) => ({
    background: captured ? 'rgba(120,220,140,0.07)' : 'rgba(255,255,255,0.03)',
    border: `1px solid ${captured ? 'rgba(120,220,140,0.25)' : 'rgba(255,255,255,0.07)'}`,
    borderRadius: 6,
    padding: '7px 9px',
  }),
  slotHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 3,
  },
  label: (captured) => ({ fontSize: 11, color: captured ? '#9de' : '#777', flex: 1 }),
  actions: { display: 'flex', gap: 4 },
  btn: (color) => ({
    fontSize: 10,
    padding: '2px 7px',
    borderRadius: 4,
    border: 'none',
    background: color,
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  }),
  coords: { color: '#888', fontFamily: 'monospace', fontSize: 10, lineHeight: 1.5 },
  addRow: { display: 'flex', gap: 6, marginTop: 2 },
  input: {
    flex: 1,
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 4,
    color: '#fff',
    fontSize: 11,
    padding: '3px 7px',
    outline: 'none',
    fontFamily: 'system-ui, sans-serif',
  },
  exportBtn: (copied) => ({
    padding: '7px 0',
    borderRadius: 6,
    border: 'none',
    background: copied ? '#2a6' : '#335',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: 12,
    transition: 'background 200ms',
    marginTop: 2,
  }),
}

// ── Helpers ──────────────────────────────────────────────────────────

function fmt(v) {
  if (!v) return '—'
  return `${v.x}, ${v.y}, ${v.z}`
}

// ── Sub-components ───────────────────────────────────────────────────

function LiveBox({ live }) {
  return (
    <div style={S.liveBox}>
      <div style={{ color: '#aaa', fontSize: 10, marginBottom: 3 }}>CAMÉRA ACTUELLE</div>
      <div>pos: {fmt(live?.position)}</div>
      <div>tgt: {fmt(live?.target)}</div>
    </div>
  )
}

function Slot({ label, captured, position, target, onCapture, onTeleport, onRename, onRemove }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(label)
  const inputRef = useRef()

  function commitRename() {
    if (draft.trim()) onRename?.(draft.trim())
    setEditing(false)
  }

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  return (
    <div style={S.slot(captured)}>
      <div style={S.slotHeader}>
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') setEditing(false)
            }}
            style={{ ...S.input, flex: 1 }}
          />
        ) : (
          <span
            style={S.label(captured)}
            onDoubleClick={() => onRename && setEditing(true)}
            title={onRename ? 'Double-clic pour renommer' : undefined}
          >
            {label}
          </span>
        )}
        <div style={S.actions}>
          {captured && (
            <button style={S.btn('#27559a')} onClick={onTeleport} title="Téléporter ici">
              →
            </button>
          )}
          <button style={S.btn('#2a6')} onClick={onCapture} title="Capturer position actuelle">
            ●
          </button>
          {onRemove && (
            <button style={S.btn('#622')} onClick={onRemove} title="Supprimer">
              ✕
            </button>
          )}
        </div>
      </div>
      {captured && (
        <div style={S.coords}>
          <div>pos: {fmt(position)}</div>
          <div>tgt: {fmt(target)}</div>
        </div>
      )}
      {!captured && <div style={{ color: '#555', fontSize: 10 }}>non capturé</div>}
    </div>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────

export default function CameraEditorPanel() {
  const [live, setLive] = useState(getLiveCamera)
  const [registry, setRegistry] = useState(getRegistry)
  const [newPovLabel, setNewPovLabel] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => onLiveCameraChange(setLive), [])
  useEffect(() => onRegistryChange(setRegistry), [])

  function capture() {
    return live ? { position: live.position, target: live.target } : null
  }

  function handleCaptureIntro(index) {
    const cam = capture()
    if (cam) captureIntroWaypoint(index, cam.position, cam.target)
  }

  function handleCapturePov(id) {
    const cam = capture()
    if (cam) captureStoryPov(id, cam.position, cam.target)
  }

  function handleAddPov() {
    const label = newPovLabel.trim()
    if (!label) return
    addStoryPov(label)
    setNewPovLabel('')
  }

  function handleExport() {
    navigator.clipboard.writeText(exportAsJS())
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div style={S.panel}>
      <div style={S.heading}>Éditeur caméra</div>

      <LiveBox live={live} />

      {/* Intro waypoints */}
      <div style={S.section}>
        <div style={S.eyebrow}>Intro cinématique</div>
        {registry.introWaypoints.map((wp) => (
          <Slot
            key={wp.index}
            label={`WP${wp.index} — ${wp.label}`}
            captured={wp.position !== null}
            position={wp.position}
            target={wp.target}
            onCapture={() => handleCaptureIntro(wp.index)}
            onTeleport={() => requestTeleport(wp.position, wp.target)}
          />
        ))}
      </div>

      {/* Story POVs */}
      <div style={S.section}>
        <div style={S.eyebrow}>POV Story</div>
        {registry.storyPovs.length === 0 && (
          <div style={{ color: '#555', fontSize: 11 }}>Aucun POV — ajoute-en un ci-dessous</div>
        )}
        {registry.storyPovs.map((pov) => (
          <Slot
            key={pov.id}
            label={pov.label}
            captured={pov.position !== null}
            position={pov.position}
            target={pov.target}
            onCapture={() => handleCapturePov(pov.id)}
            onTeleport={() => requestTeleport(pov.position, pov.target)}
            onRename={(label) => renameStoryPov(pov.id, label)}
            onRemove={() => removeStoryPov(pov.id)}
          />
        ))}
        <div style={S.addRow}>
          <input
            style={S.input}
            placeholder="Nom du POV (ex: accueil)"
            value={newPovLabel}
            onChange={(e) => setNewPovLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddPov()}
          />
          <button style={S.btn('#446')} onClick={handleAddPov}>
            +
          </button>
        </div>
      </div>

      <button style={S.exportBtn(copied)} onClick={handleExport}>
        {copied ? '✓ Copié !' : 'Exporter en JS'}
      </button>
    </div>
  )
}
