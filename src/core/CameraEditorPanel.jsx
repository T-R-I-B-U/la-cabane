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

const GROUPS = ['intro', 'story', 'arbre', 'debug']
const INITIAL_PANEL_POSITION = { x: 20, y: 20 }
const PANEL_POSITION_KEY = 'lacabane:camera-editor-panel-position'

const S = {
  shell: {
    position: 'fixed',
    zIndex: 900,
    width: 760,
    height: 'min(760px, calc(100vh - 40px))',
    maxHeight: 'calc(100vh - 40px)',
    display: 'grid',
    gridTemplateColumns: '230px 1fr',
    gridTemplateRows: 'auto minmax(0, 1fr)',
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
    gridColumn: '1 / -1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '12px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    background: 'linear-gradient(90deg, rgba(46,124,173,0.22), rgba(255,255,255,0.03))',
    cursor: 'grab',
    userSelect: 'none',
  },
  headerDragging: { cursor: 'grabbing' },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: 12,
    borderRight: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
    minHeight: 0,
    overflowY: 'auto',
  },
  main: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: 14,
    overflowY: 'auto',
    minHeight: 0,
  },
  title: { fontSize: 14, fontWeight: 800, color: '#9de3ff' },
  subtitle: { color: '#a6b0bd', fontSize: 11 },
  nav: { display: 'flex', gap: 6 },
  navButton: (active) => ({
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 999,
    padding: '7px 12px',
    background: active ? 'rgba(124,255,194,0.14)' : 'rgba(255,255,255,0.055)',
    color: active ? '#caffea' : '#c7d0dc',
    cursor: 'pointer',
    fontWeight: 800,
  }),
  groupTabs: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 },
  tab: (active) => ({
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 8,
    padding: '6px 7px',
    background: active ? 'rgba(96,190,255,0.22)' : 'rgba(255,255,255,0.045)',
    color: active ? '#dff6ff' : '#a8b0ba',
    cursor: 'pointer',
    fontWeight: 700,
    textTransform: 'capitalize',
  }),
  list: { display: 'flex', flexDirection: 'column', gap: 5, overflowY: 'auto' },
  row: (active) => ({
    textAlign: 'left',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 8,
    padding: '7px 8px',
    background: active ? 'rgba(124,255,194,0.13)' : 'rgba(255,255,255,0.035)',
    color: active ? '#cbffe9' : '#d6dbe0',
    cursor: 'pointer',
  }),
  rowId: { display: 'block', marginTop: 2, color: '#77808c', fontSize: 10 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { color: '#8e99a8', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.055)',
    color: '#fff',
    padding: '7px 9px',
    outline: 'none',
    font: 'inherit',
  },
  btnRow: { display: 'flex', flexWrap: 'wrap', gap: 7 },
  btn: (tone = 'default') => {
    const tones = {
      default: '#334055',
      primary: '#1673a8',
      good: '#247b54',
      warn: '#8b5530',
      danger: '#763441',
    }
    return {
      border: 'none',
      borderRadius: 8,
      padding: '7px 9px',
      background: tones[tone],
      color: '#fff',
      cursor: 'pointer',
      fontWeight: 800,
      fontSize: 11,
    }
  },
  live: {
    background: 'rgba(255,255,255,0.055)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 10,
    color: '#c9d1d9',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    lineHeight: 1.6,
  },
  card: {
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.035)',
    padding: 12,
  },
  cardTitle: { fontSize: 12, fontWeight: 900, marginBottom: 9, color: '#e7edf5' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  step: {
    display: 'grid',
    gridTemplateColumns: '28px 1fr 72px 72px 86px 72px auto',
    gap: 7,
    alignItems: 'center',
    padding: 8,
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    background: 'rgba(255,255,255,0.035)',
  },
  smallInput: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 7,
    background: 'rgba(0,0,0,0.18)',
    color: '#fff',
    padding: '6px 7px',
    outline: 'none',
    font: 'inherit',
  },
  empty: { color: '#7c8490', padding: 10, textAlign: 'center' },
  stepCard: {
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.04)',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  stepHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  stepNum: {
    fontWeight: 900,
    color: '#9de3ff',
    fontSize: 12,
    minWidth: 24,
    flexShrink: 0,
  },
  stepFieldLabel: {
    color: '#8e99a8',
    fontSize: 9,
    fontWeight: 800,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
}

function fmt(v) {
  if (!v) return 'non capturé'
  return `${v.x}, ${v.y}, ${v.z}`
}

function loadPanelPosition() {
  try {
    const raw = localStorage.getItem(PANEL_POSITION_KEY)
    if (!raw) return INITIAL_PANEL_POSITION
    const parsed = JSON.parse(raw)
    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') {
      return INITIAL_PANEL_POSITION
    }
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
  const [group, setGroup] = useState('intro')
  const [selectedId, setSelectedId] = useState('intro.start')
  const [view, setView] = useState('cameras')
  const [newLabel, setNewLabel] = useState('Nouvelle caméra')
  const [copied, setCopied] = useState(false)
  const [flyMode, setFlyModeState] = useState(getEditorFlyMode)

  useEffect(() => onRegistryChange(setRegistry), [])
  useEffect(() => onLiveCameraChange(setLive), [])
  useEffect(() => onEditorFlyModeChange(setFlyModeState), [])

  const cameras = useMemo(
    () => registry.cameras.filter((camera) => camera.group === group),
    [group, registry.cameras]
  )
  const selected = cameras.find((camera) => camera.id === selectedId) ?? cameras[0] ?? null
  const introSteps = registry.sequences?.intro ?? []

  function handleAddCamera() {
    const camera = addCamera({ label: newLabel.trim() || 'Nouvelle caméra', group })
    setSelectedId(camera.id)
  }

  function handleExport() {
    navigator.clipboard.writeText(exportAsJSON())
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  function handleFlyModeToggle() {
    setEditorFlyMode(!flyMode)
  }

  function handleDragStart(event) {
    if (event.button !== 0) return
    if (event.target.closest('button, input, textarea, select')) return

    const rect = panelRef.current?.getBoundingClientRect()
    if (!rect) return

    dragRef.current = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    }
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handleDragMove(event) {
    if (!dragRef.current) return

    const rect = panelRef.current?.getBoundingClientRect()
    const width = rect?.width ?? 760
    const height = rect?.height ?? 520
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

  function handleClearAll() {
    clearAllCameraStorage()
    setPanelPosition(INITIAL_PANEL_POSITION)
    persistPanelPosition(INITIAL_PANEL_POSITION)
  }

  function handleClose() {
    setEditorFlyMode(false)
    onClose?.()
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
          <div style={S.subtitle}>Création, fly mode, capture et caméras de scénario</div>
        </div>
        <div style={S.nav}>
          <button
            type="button"
            style={S.navButton(view === 'cameras')}
            onClick={() => setView('cameras')}
          >
            Caméras
          </button>
          <button
            type="button"
            style={S.navButton(view === 'scenario')}
            onClick={() => setView('scenario')}
          >
            Scénario
          </button>
          <button
            type="button"
            style={S.navButton(view === 'characters')}
            onClick={() => setView('characters')}
          >
            PNJ
          </button>
          <button type="button" style={S.btn()} onClick={handleClose}>
            Fermer
          </button>
        </div>
      </header>

      <aside style={S.sidebar}>
        <div>
          <div style={S.title}>Bibliothèque</div>
          <div style={S.subtitle}>{registry.cameras.length} caméras enregistrées</div>
        </div>
        <div style={S.groupTabs}>
          {GROUPS.map((name) => (
            <button
              key={name}
              type="button"
              style={S.tab(group === name)}
              onClick={() => setGroup(name)}
            >
              {name}
            </button>
          ))}
        </div>
        <div style={S.list}>
          {cameras.map((camera) => (
            <button
              key={camera.id}
              type="button"
              style={S.row(selected?.id === camera.id)}
              onClick={() => setSelectedId(camera.id)}
            >
              {camera.label}
              <span style={S.rowId}>{camera.id}</span>
            </button>
          ))}
          {cameras.length === 0 && <div style={S.empty}>Aucune caméra dans ce groupe</div>}
        </div>
        <div style={S.field}>
          <span style={S.label}>Ajouter</span>
          <input style={S.input} value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
          <button type="button" style={S.btn('primary')} onClick={handleAddCamera}>
            Ajouter caméra
          </button>
        </div>
      </aside>

      <section style={S.main}>
        <div style={S.btnRow}>
          <button
            type="button"
            style={S.btn(flyMode ? 'good' : 'default')}
            onClick={handleFlyModeToggle}
          >
            Fly mode {flyMode ? 'ON' : 'OFF'}
          </button>
          <button type="button" style={S.btn()} onClick={handleExport}>
            {copied ? 'JSON copié' : 'Exporter JSON'}
          </button>
          <button type="button" style={S.btn('warn')} onClick={resetCameraRegistry}>
            Reset local
          </button>
          <button type="button" style={S.btn('danger')} onClick={handleClearAll}>
            Reset tout localStorage
          </button>
        </div>

        <div style={S.live}>
          <strong>Caméra live</strong>
          <div>pos: {fmt(live?.position)}</div>
          <div>tgt: {fmt(live?.target)}</div>
          <div>fov: {live?.fov ?? 'n/a'}</div>
          <div>ZQSD + souris maintenue en fly mode, Echap pour sortir.</div>
        </div>

        {view === 'cameras' && selected && (
          <>
            <div style={S.card}>
              <div style={S.cardTitle}>Caméra sélectionnée</div>
              <div style={S.grid2}>
                <div style={S.field}>
                  <span style={S.label}>Label</span>
                  <input
                    style={S.input}
                    value={selected.label}
                    onChange={(e) => updateCamera(selected.id, { label: e.target.value })}
                  />
                </div>
                <div style={S.field}>
                  <span style={S.label}>Groupe</span>
                  <select
                    style={S.input}
                    value={selected.group}
                    onChange={(e) => {
                      updateCamera(selected.id, { group: e.target.value })
                      setGroup(e.target.value)
                    }}
                  >
                    {GROUPS.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div style={S.live}>
              <strong>{selected.id}</strong>
              <div>pos: {fmt(selected.position)}</div>
              <div>tgt: {fmt(selected.target)}</div>
              <div>fov: {selected.fov ?? 60}</div>
            </div>
            <div style={S.btnRow}>
              <button
                type="button"
                style={S.btn('good')}
                onClick={() => captureCamera(selected.id, live)}
              >
                Enregistrer position
              </button>
              <button
                type="button"
                style={S.btn('primary')}
                onClick={() => requestTeleport(selected.position, selected.target, selected.fov)}
              >
                Aller à la caméra
              </button>
              <button type="button" style={S.btn()} onClick={() => duplicateCamera(selected.id)}>
                Dupliquer
              </button>
              <button
                type="button"
                style={S.btn('danger')}
                onClick={() => removeCamera(selected.id)}
              >
                Supprimer
              </button>
            </div>
          </>
        )}

        {view === 'scenario' && (
          <div style={S.card}>
            <div style={S.cardTitle}>Séquence intro</div>
            <div style={{ ...S.btnRow, marginBottom: 10 }}>
              <button
                type="button"
                style={S.btn('primary')}
                disabled={!selected}
                onClick={() => selected && addSequenceStep('intro', selected.id)}
              >
                Ajouter la caméra sélectionnée
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {introSteps.map((step, index) => {
                const camera = registry.cameras.find((item) => item.id === step.cameraId)
                return (
                  <div key={`${step.cameraId}-${index}`} style={S.stepCard}>
                    <div style={S.stepHeader}>
                      <span style={S.stepNum}>#{index + 1}</span>
                      <select
                        style={{ ...S.smallInput, flex: 1 }}
                        value={step.cameraId}
                        onChange={(e) =>
                          updateSequenceStep('intro', index, { cameraId: e.target.value })
                        }
                      >
                        {registry.cameras.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label}
                          </option>
                        ))}
                      </select>
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      <div>
                        <div style={S.stepFieldLabel}>Durée (s)</div>
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
                        <div style={S.stepFieldLabel}>Délai (s)</div>
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
                        <div style={S.stepFieldLabel}>Easing</div>
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

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        gap: 8,
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={S.stepFieldLabel}>Évènement</div>
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
                          paddingTop: 16,
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

                    {camera && <div style={{ color: '#7e8793', fontSize: 10 }}>{camera.id}</div>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {view === 'characters' && (
          <div style={S.card}>
            <div style={S.cardTitle}>Positions PNJ</div>
            <div style={{ color: '#9aa6b5', marginBottom: 10 }}>
              Capturer depuis la caméra reprend X/Z, puis utilise la hauteur de sol propre au PNJ.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {(registry.characters ?? []).map((character) => (
                <div key={character.id} style={S.card}>
                  <div style={{ ...S.btnRow, justifyContent: 'space-between', marginBottom: 10 }}>
                    <strong>{character.label}</strong>
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
          </div>
        )}
      </section>
    </div>
  )
}
