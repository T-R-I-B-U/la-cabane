import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addCamera,
  addSequenceStep,
  captureCharacterFromCamera,
  captureCamera,
  clearAllCameraStorage,
  duplicateCamera,
  exportAsJSON,
  getEditorFlyMode,
  getLiveCamera,
  getRegistry,
  onEditorFlyModeChange,
  onLiveCameraChange,
  onRegistryChange,
  moveSequenceStep,
  removeCamera,
  removeSequenceStep,
  requestTeleport,
  resetCameraRegistry,
  setEditorFlyMode,
  updateCamera,
  updateCharacter,
  updateSequenceStep,
} from './cameraRegistry'

const INITIAL_PANEL_POSITION = { x: 20, y: 20 }
const PANEL_POSITION_KEY = 'lacabane:camera-editor-panel-position'

const S = {
  shell: {
    position: 'fixed',
    zIndex: 900,
    width: 860,
    maxHeight: 'calc(100vh - 40px)',
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(7, 9, 13, 0.96)',
    color: '#f4f7fb',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 18px 60px rgba(0,0,0,0.45)',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 12,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    background: 'linear-gradient(90deg, rgba(46,124,173,0.22), rgba(255,255,255,0.03))',
    cursor: 'grab',
    userSelect: 'none',
    flexShrink: 0,
  },
  headerDragging: { cursor: 'grabbing' },
  liveBar: {
    padding: '7px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.025)',
    display: 'flex',
    gap: 20,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 11,
    color: '#8a9aaa',
    flexShrink: 0,
    flexWrap: 'wrap',
  },
  body: {
    overflowY: 'auto',
    flex: 1,
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 800,
    textTransform: 'uppercase',
    color: '#566070',
    letterSpacing: '0.1em',
  },
  divider: {
    height: 1,
    background: 'rgba(255,255,255,0.07)',
    margin: '4px 0',
    flexShrink: 0,
  },
  title: { fontSize: 14, fontWeight: 800, color: '#9de3ff' },
  subtitle: { color: '#a6b0bd', fontSize: 11, marginTop: 1 },
  nav: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' },
  btn: (tone = 'default') => {
    const tones = {
      default: '#2e3d50',
      primary: '#1673a8',
      good: '#247b54',
      warn: '#8b5530',
      danger: '#763441',
      ghost: 'rgba(255,255,255,0.07)',
    }
    return {
      border: 'none',
      borderRadius: 8,
      padding: '6px 10px',
      background: tones[tone],
      color: '#fff',
      cursor: 'pointer',
      fontWeight: 700,
      fontSize: 11,
      flexShrink: 0,
      lineHeight: 1.4,
    }
  },
  btnRow: { display: 'flex', flexWrap: 'wrap', gap: 5 },
  stepCard: {
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
    flexShrink: 0,
  },
  stepCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '9px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.025)',
  },
  stepNum: {
    fontWeight: 900,
    color: '#9de3ff',
    fontSize: 11,
    minWidth: 22,
    flexShrink: 0,
  },
  stepLabelInput: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#e8ecf2',
    fontWeight: 700,
    fontSize: 13,
    flex: 1,
    fontFamily: 'inherit',
    padding: 0,
    minWidth: 0,
  },
  stepBody: {
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 9,
  },
  poseRow: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 10,
    color: '#6a7a8a',
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap',
  },
  timingRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 8,
  },
  eventRow: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: 8,
    alignItems: 'end',
  },
  fieldLabel: {
    color: '#6a7a8a',
    fontSize: 9,
    fontWeight: 800,
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: '0.07em',
  },
  smallInput: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 7,
    background: 'rgba(0,0,0,0.22)',
    color: '#fff',
    padding: '6px 8px',
    outline: 'none',
    fontFamily: 'inherit',
    fontSize: 11,
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.055)',
    color: '#fff',
    padding: '7px 9px',
    outline: 'none',
    fontFamily: 'inherit',
    fontSize: 12,
  },
  camLibRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 10px',
    borderRadius: 9,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
  },
  camLibLabel: {
    fontWeight: 600,
    color: '#c8d2dc',
    fontSize: 12,
  },
  camLibId: {
    color: '#566070',
    fontSize: 10,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    marginTop: 2,
  },
  charCard: {
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.03)',
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { color: '#8e99a8', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' },
  empty: { color: '#566070', padding: '10px 0', textAlign: 'center', fontSize: 11 },
  addRow: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
  },
}

function fmt(v) {
  if (!v) return '—'
  return `${v.x.toFixed(3)}, ${v.y.toFixed(3)}, ${v.z.toFixed(3)}`
}

function loadPanelPosition() {
  try {
    const raw = localStorage.getItem(PANEL_POSITION_KEY)
    if (!raw) return INITIAL_PANEL_POSITION
    const parsed = JSON.parse(raw)
    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return INITIAL_PANEL_POSITION
    return parsed
  } catch {
    return INITIAL_PANEL_POSITION
  }
}

function persistPanelPosition(position) {
  try {
    localStorage.setItem(PANEL_POSITION_KEY, JSON.stringify(position))
  } catch {
    // localStorage can be unavailable in private browsing.
  }
}

function stopScenePointerEvent(event) {
  event.stopPropagation()
}

export default function CameraEditorPanel({ onClose }) {
  const panelRef = useRef(null)
  const dragRef = useRef(null)
  const [registry, setRegistry] = useState(getRegistry)
  const [live, setLive] = useState(getLiveCamera)
  const [panelPosition, setPanelPosition] = useState(loadPanelPosition)
  const [isDragging, setIsDragging] = useState(false)
  const [newLabel, setNewLabel] = useState('Nouvelle caméra')
  const [copied, setCopied] = useState(false)
  const [flyMode, setFlyModeState] = useState(getEditorFlyMode)
  const [showOtherCams, setShowOtherCams] = useState(false)
  const [showChars, setShowChars] = useState(false)

  useEffect(() => onRegistryChange(setRegistry), [])
  useEffect(() => onLiveCameraChange(setLive), [])
  useEffect(() => onEditorFlyModeChange(setFlyModeState), [])

  const introSteps = registry.sequences?.intro ?? []
  const sequencedIds = useMemo(() => new Set(introSteps.map((s) => s.cameraId)), [introSteps])
  const otherCameras = useMemo(
    () => registry.cameras.filter((c) => !sequencedIds.has(c.id)),
    [registry.cameras, sequencedIds]
  )

  function handleAddToSequence() {
    const camera = addCamera({ label: newLabel.trim() || 'Nouvelle caméra', group: 'intro' })
    addSequenceStep('intro', camera.id)
  }

  function handleExport() {
    navigator.clipboard.writeText(exportAsJSON())
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  function handleClearAll() {
    clearAllCameraStorage()
    setPanelPosition(INITIAL_PANEL_POSITION)
    persistPanelPosition(INITIAL_PANEL_POSITION)
  }

  function handleClose() {
    setEditorFlyMode(false)
    onClose?.()
  }

  function handleDragStart(event) {
    if (event.button !== 0) return
    if (event.target.closest('button, input, textarea, select')) return
    const rect = panelRef.current?.getBoundingClientRect()
    if (!rect) return
    dragRef.current = { offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top }
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handleDragMove(event) {
    if (!dragRef.current) return
    const rect = panelRef.current?.getBoundingClientRect()
    const width = rect?.width ?? 860
    const height = rect?.height ?? 600
    const maxX = Math.max(window.innerWidth - width, 0)
    const maxY = Math.max(window.innerHeight - height, 0)
    const nextPosition = {
      x: Math.min(Math.max(event.clientX - dragRef.current.offsetX, 0), maxX),
      y: Math.min(Math.max(event.clientY - dragRef.current.offsetY, 0), maxY),
    }
    setPanelPosition(nextPosition)
    persistPanelPosition(nextPosition)
  }

  function handleDragEnd(event) {
    if (!dragRef.current) return
    dragRef.current = null
    setIsDragging(false)
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  useEffect(() => () => setEditorFlyMode(false), [])

  return (
    <div
      ref={panelRef}
      style={{ ...S.shell, left: panelPosition.x, top: panelPosition.y }}
      onPointerDown={stopScenePointerEvent}
      onPointerUp={stopScenePointerEvent}
      onClick={stopScenePointerEvent}
      onDoubleClick={stopScenePointerEvent}
      onWheel={stopScenePointerEvent}
    >
      <header
        style={{ ...S.header, ...(isDragging ? S.headerDragging : null) }}
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
      >
        <div>
          <div style={S.title}>F2 Camera Editor</div>
          <div style={S.subtitle}>
            {registry.cameras.length} caméras · {introSteps.length} dans la séquence
          </div>
        </div>
        <div style={S.nav}>
          <button
            type="button"
            style={S.btn(flyMode ? 'good' : 'default')}
            onClick={() => setEditorFlyMode(!flyMode)}
          >
            Fly {flyMode ? 'ON' : 'OFF'}
          </button>
          <button type="button" style={S.btn()} onClick={handleExport}>
            {copied ? 'Copié ✓' : 'Exporter JSON'}
          </button>
          <button type="button" style={S.btn('warn')} onClick={resetCameraRegistry}>
            Reset
          </button>
          <button type="button" style={S.btn('danger')} onClick={handleClearAll}>
            Reset tout localStorage
          </button>
          <button type="button" style={S.btn()} onClick={handleClose}>
            Fermer
          </button>
        </div>
      </header>

      <div style={S.liveBar}>
        <span>
          <strong style={{ color: '#c0ccd8' }}>pos</strong> {fmt(live?.position)}
        </span>
        <span>
          <strong style={{ color: '#c0ccd8' }}>tgt</strong> {fmt(live?.target)}
        </span>
        <span>
          <strong style={{ color: '#c0ccd8' }}>fov</strong> {live?.fov ?? '—'}
        </span>
        <span style={{ color: '#334455', marginLeft: 'auto' }}>
          ZQSD + souris · Échap pour sortir
        </span>
      </div>

      <div style={S.body}>
        {/* ── Séquence intro ─────────────────────────────────────── */}
        <div style={S.section}>
          <div style={S.sectionHeader}>
            <span style={S.sectionTitle}>Séquence intro · {introSteps.length} étapes</span>
            <div style={S.addRow}>
              <input
                style={{ ...S.smallInput, width: 180 }}
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Nom de la caméra"
                onPointerDown={(e) => e.stopPropagation()}
              />
              <button type="button" style={S.btn('primary')} onClick={handleAddToSequence}>
                + Ajouter
              </button>
            </div>
          </div>

          {introSteps.length === 0 && (
            <div style={S.empty}>Aucune caméra dans la séquence — ajoute une caméra ci-dessus</div>
          )}

          {introSteps.map((step, index) => {
            const camera = registry.cameras.find((c) => c.id === step.cameraId)
            return (
              <div key={`${step.cameraId}-${index}`} style={S.stepCard}>
                <div style={S.stepCardHeader}>
                  <span style={S.stepNum}>#{index + 1}</span>
                  <input
                    style={S.stepLabelInput}
                    value={camera?.label ?? step.cameraId}
                    onChange={(e) => camera && updateCamera(camera.id, { label: e.target.value })}
                    onPointerDown={(e) => e.stopPropagation()}
                  />
                  <div style={S.btnRow}>
                    {camera && (
                      <button
                        type="button"
                        style={S.btn('good')}
                        onClick={() => captureCamera(camera.id, live)}
                      >
                        Capturer
                      </button>
                    )}
                    {camera?.position && (
                      <button
                        type="button"
                        style={S.btn('primary')}
                        onClick={() => requestTeleport(camera.position, camera.target, camera.fov)}
                      >
                        Aller
                      </button>
                    )}
                    {camera && (
                      <button
                        type="button"
                        style={S.btn()}
                        onClick={() => duplicateCamera(camera.id)}
                      >
                        Dupliquer
                      </button>
                    )}
                    <button
                      type="button"
                      style={S.btn()}
                      onClick={() => moveSequenceStep('intro', index, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      style={S.btn()}
                      onClick={() => moveSequenceStep('intro', index, 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      style={S.btn('danger')}
                      onClick={() => removeSequenceStep('intro', index)}
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div style={S.stepBody}>
                  {camera ? (
                    <div style={S.poseRow}>
                      <span>
                        <strong style={{ color: '#8a9aaa' }}>pos</strong> {fmt(camera.position)}
                      </span>
                      <span>
                        <strong style={{ color: '#8a9aaa' }}>tgt</strong> {fmt(camera.target)}
                      </span>
                      <span>
                        <strong style={{ color: '#8a9aaa' }}>fov</strong> {camera.fov ?? 60}
                      </span>
                      <span style={{ color: '#334455' }}>{camera.id}</span>
                    </div>
                  ) : (
                    <div style={{ color: '#e06060', fontSize: 11 }}>
                      Caméra introuvable : {step.cameraId}
                    </div>
                  )}

                  <div style={S.timingRow}>
                    <div>
                      <div style={S.fieldLabel}>Durée (s)</div>
                      <input
                        style={S.smallInput}
                        type="number"
                        step="0.1"
                        min="0"
                        value={step.duration ?? 1.2}
                        onChange={(e) =>
                          updateSequenceStep('intro', index, { duration: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <div style={S.fieldLabel}>Délai (s)</div>
                      <input
                        style={S.smallInput}
                        type="number"
                        step="0.1"
                        min="0"
                        value={step.delay ?? 0}
                        onChange={(e) =>
                          updateSequenceStep('intro', index, { delay: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <div style={S.fieldLabel}>Easing</div>
                      <select
                        style={S.smallInput}
                        value={step.easing ?? 'easeInOut'}
                        onChange={(e) =>
                          updateSequenceStep('intro', index, { easing: e.target.value })
                        }
                      >
                        <option value="easeInOut">easeInOut</option>
                        <option value="easeIn">easeIn</option>
                        <option value="easeOut">easeOut</option>
                        <option value="linear">linear</option>
                      </select>
                    </div>
                  </div>

                  <div style={S.eventRow}>
                    <div>
                      <div style={S.fieldLabel}>Évènement</div>
                      <input
                        style={S.smallInput}
                        value={step.event ?? ''}
                        placeholder="ex: doors:open"
                        onChange={(e) =>
                          updateSequenceStep('intro', index, { event: e.target.value })
                        }
                      />
                    </div>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        color: '#c7d0dc',
                        whiteSpace: 'nowrap',
                        paddingBottom: 2,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(step.waitForInput)}
                        onChange={(e) =>
                          updateSequenceStep('intro', index, { waitForInput: e.target.checked })
                        }
                      />
                      Attendre input
                    </label>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div style={S.divider} />

        {/* ── Autres caméras ─────────────────────────────────────── */}
        <div style={S.section}>
          <div style={S.sectionHeader}>
            <span style={S.sectionTitle}>Autres caméras · {otherCameras.length}</span>
            <button
              type="button"
              style={S.btn('ghost')}
              onClick={() => setShowOtherCams((v) => !v)}
            >
              {showOtherCams ? '▾ Masquer' : '▸ Afficher'}
            </button>
          </div>

          {showOtherCams && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {otherCameras.length === 0 && (
                <div style={S.empty}>Toutes les caméras sont déjà dans la séquence</div>
              )}
              {otherCameras.map((camera) => (
                <div key={camera.id} style={S.camLibRow}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={S.camLibLabel}>{camera.label}</div>
                    <div style={S.camLibId}>{camera.id}</div>
                  </div>
                  <div style={S.btnRow}>
                    <button
                      type="button"
                      style={S.btn('good')}
                      onClick={() => captureCamera(camera.id, live)}
                    >
                      Capturer
                    </button>
                    {camera.position && (
                      <button
                        type="button"
                        style={S.btn('primary')}
                        onClick={() => requestTeleport(camera.position, camera.target, camera.fov)}
                      >
                        Aller
                      </button>
                    )}
                    <button
                      type="button"
                      style={S.btn()}
                      onClick={() => addSequenceStep('intro', camera.id)}
                    >
                      + Séquence
                    </button>
                    <button
                      type="button"
                      style={S.btn('danger')}
                      onClick={() => removeCamera(camera.id)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={S.divider} />

        {/* ── Positions PNJ ──────────────────────────────────────── */}
        <div style={S.section}>
          <div style={S.sectionHeader}>
            <span style={S.sectionTitle}>Positions PNJ · {(registry.characters ?? []).length}</span>
            <button type="button" style={S.btn('ghost')} onClick={() => setShowChars((v) => !v)}>
              {showChars ? '▾ Masquer' : '▸ Afficher'}
            </button>
          </div>

          {showChars && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ color: '#566070', fontSize: 11, marginBottom: 2 }}>
                Capturer depuis la caméra reprend X/Z, puis utilise la hauteur de sol propre au PNJ.
              </div>
              {(registry.characters ?? []).map((character) => (
                <div key={character.id} style={S.charCard}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <strong style={{ color: '#e7edf5', fontSize: 13 }}>{character.label}</strong>
                    <button
                      type="button"
                      style={S.btn('good')}
                      onClick={() => captureCharacterFromCamera(character.id, live)}
                    >
                      Capturer X/Z
                    </button>
                  </div>
                  <div style={S.grid2}>
                    <div style={S.field}>
                      <span style={S.label}>X</span>
                      <input
                        style={S.input}
                        type="number"
                        step="0.0001"
                        value={character.position?.x ?? 0}
                        onChange={(e) =>
                          updateCharacter(character.id, {
                            position: { ...character.position, x: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                    <div style={S.field}>
                      <span style={S.label}>Z</span>
                      <input
                        style={S.input}
                        type="number"
                        step="0.0001"
                        value={character.position?.z ?? 0}
                        onChange={(e) =>
                          updateCharacter(character.id, {
                            position: { ...character.position, z: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                    <div style={S.field}>
                      <span style={S.label}>Hauteur Y</span>
                      <input
                        style={S.input}
                        type="number"
                        step="0.0001"
                        value={character.position?.y ?? character.floorY ?? 0}
                        onChange={(e) =>
                          updateCharacter(character.id, {
                            position: { ...character.position, y: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                    <div style={S.field}>
                      <span style={S.label}>Sol PNJ</span>
                      <input
                        style={S.input}
                        type="number"
                        step="0.0001"
                        value={character.floorY ?? character.position?.y ?? 0}
                        onChange={(e) =>
                          updateCharacter(character.id, { floorY: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div style={S.field}>
                      <span style={S.label}>Rotation Y</span>
                      <input
                        style={S.input}
                        type="number"
                        step="0.01"
                        value={character.rotationY ?? 0}
                        onChange={(e) =>
                          updateCharacter(character.id, { rotationY: Number(e.target.value) })
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
