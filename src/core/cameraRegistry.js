import defaultConfig from '../cameras.json'

const STORAGE_KEY = 'lacabane:camera-registry:v2'

const DEFAULT_CONFIG = defaultConfig

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function normalizeId(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
}

function roundVec(v) {
  return { x: +v.x.toFixed(4), y: +v.y.toFixed(4), z: +v.z.toFixed(4) }
}

function mergeById(defaultItems, savedItems) {
  const savedById = new Map(savedItems.map((item) => [item.id, item]))
  const merged = defaultItems.map((item) => ({ ...item, ...savedById.get(item.id) }))
  const defaultIds = new Set(defaultItems.map((item) => item.id))
  return [...merged, ...savedItems.filter((item) => !defaultIds.has(item.id))]
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed.cameras)) return null
    return {
      ...clone(DEFAULT_CONFIG),
      ...parsed,
      cameras: mergeById(DEFAULT_CONFIG.cameras, parsed.cameras),
      characters: Array.isArray(parsed.characters)
        ? mergeById(DEFAULT_CONFIG.characters, parsed.characters)
        : clone(DEFAULT_CONFIG.characters),
    }
  } catch {
    return null
  }
}

function persist(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorage unavailable (private browsing, quota exceeded)
  }
}

let _state = load() ?? clone(DEFAULT_CONFIG)
let _stateListeners = []
let _liveCamera = null
let _liveListeners = []
let _pendingTeleport = null
let _editorFlyMode = false
let _flyModeListeners = []

function notify() {
  _stateListeners.forEach((fn) => fn(_state))
}

function save(nextState) {
  _state = nextState
  persist(_state)
  notify()
}

export function getRegistry() {
  return _state
}

export function onRegistryChange(fn) {
  _stateListeners.push(fn)
  return () => {
    _stateListeners = _stateListeners.filter((l) => l !== fn)
  }
}

export function resetCameraRegistry() {
  save(clone(DEFAULT_CONFIG))
}

export function clearAllCameraStorage() {
  const keys = [
    STORAGE_KEY,
    'lacabane:camera-editor-panel-position',
    'lacabane:cinematic-presets:v1',
  ]
  keys.forEach((key) => {
    try {
      localStorage.removeItem(key)
    } catch {
      // localStorage unavailable (private browsing, quota exceeded)
    }
  })
  _state = clone(DEFAULT_CONFIG)
  notify()
}

export function getCameraPose(id) {
  return _state.cameras.find((camera) => camera.id === id) ?? null
}

export function getDefaultCameraPose(id) {
  return DEFAULT_CONFIG.cameras.find((camera) => camera.id === id) ?? null
}

export function getCameraSequence(id) {
  return _state.sequences?.[id] ?? []
}

export function getCharacterPose(id) {
  return _state.characters?.find((character) => character.id === id) ?? null
}

export function getIntroWaypoints() {
  return getCameraSequence('intro')
    .map((step) => {
      const camera = getCameraPose(step.cameraId)
      if (!camera) return null
      return { ...step, ...camera }
    })
    .filter(Boolean)
}

export function addCamera({ label, group = 'story' }) {
  const baseId = normalizeId(`${group}.${label}`) || `${group}.camera`
  const existingIds = new Set(_state.cameras.map((camera) => camera.id))
  let id = baseId
  let index = 2
  while (existingIds.has(id)) {
    id = `${baseId}.${index}`
    index += 1
  }

  const camera = {
    id,
    label,
    group,
    position: null,
    target: null,
    fov: 60,
  }
  save({ ..._state, cameras: [..._state.cameras, camera] })
  return camera
}

export function updateCamera(id, patch) {
  save({
    ..._state,
    cameras: _state.cameras.map((camera) =>
      camera.id === id ? { ...camera, ...patch, id: camera.id } : camera
    ),
  })
}

export function captureCamera(id, liveCamera) {
  if (!liveCamera) return
  updateCamera(id, {
    position: roundVec(liveCamera.position),
    target: roundVec(liveCamera.target),
    fov: liveCamera.fov ?? 60,
  })
}

export function duplicateCamera(id) {
  const source = getCameraPose(id)
  if (!source) return null
  const camera = addCamera({ label: `${source.label} copie`, group: source.group })
  updateCamera(camera.id, {
    position: source.position,
    target: source.target,
    fov: source.fov,
  })
  return camera
}

export function removeCamera(id) {
  save({
    ..._state,
    cameras: _state.cameras.filter((camera) => camera.id !== id),
    sequences: Object.fromEntries(
      Object.entries(_state.sequences ?? {}).map(([key, steps]) => [
        key,
        steps.filter((step) => step.cameraId !== id),
      ])
    ),
  })
}

export function addSequenceStep(sequenceId, cameraId) {
  const steps = _state.sequences?.[sequenceId] ?? []
  save({
    ..._state,
    sequences: {
      ...(_state.sequences ?? {}),
      [sequenceId]: [...steps, { cameraId, duration: 1.2 }],
    },
  })
}

export function updateSequenceStep(sequenceId, index, patch) {
  const steps = _state.sequences?.[sequenceId] ?? []
  save({
    ..._state,
    sequences: {
      ...(_state.sequences ?? {}),
      [sequenceId]: steps.map((step, i) => (i === index ? { ...step, ...patch } : step)),
    },
  })
}

export function removeSequenceStep(sequenceId, index) {
  const steps = _state.sequences?.[sequenceId] ?? []
  save({
    ..._state,
    sequences: {
      ...(_state.sequences ?? {}),
      [sequenceId]: steps.filter((_, i) => i !== index),
    },
  })
}

export function moveSequenceStep(sequenceId, index, direction) {
  const steps = [...(_state.sequences?.[sequenceId] ?? [])]
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= steps.length) return
  const current = steps[index]
  steps[index] = steps[nextIndex]
  steps[nextIndex] = current
  save({
    ..._state,
    sequences: {
      ...(_state.sequences ?? {}),
      [sequenceId]: steps,
    },
  })
}

export function updateCharacter(id, patch) {
  save({
    ..._state,
    characters: (_state.characters ?? []).map((character) =>
      character.id === id ? { ...character, ...patch, id: character.id } : character
    ),
  })
}

export function captureCharacterFromCamera(id, liveCamera) {
  if (!liveCamera?.position) return
  const character = getCharacterPose(id)
  const floorY = character?.floorY ?? character?.position?.y ?? 0
  updateCharacter(id, {
    position: {
      x: +liveCamera.position.x.toFixed(4),
      y: floorY,
      z: +liveCamera.position.z.toFixed(4),
    },
  })
}

export function exportAsJSON() {
  return `${JSON.stringify(_state, null, 2)}\n`
}

export function notifyLiveCamera(cam) {
  _liveCamera = cam
  _liveListeners.forEach((fn) => fn(cam))
}

export function getLiveCamera() {
  return _liveCamera
}

export function onLiveCameraChange(fn) {
  _liveListeners.push(fn)
  return () => {
    _liveListeners = _liveListeners.filter((l) => l !== fn)
  }
}

export function requestTeleport(position, target, fov) {
  if (!position || !target) return
  _pendingTeleport = { position, target, fov }
}

export function consumeTeleport() {
  const t = _pendingTeleport
  _pendingTeleport = null
  return t
}

export function getEditorFlyMode() {
  return _editorFlyMode
}

export function setEditorFlyMode(value) {
  if (_editorFlyMode === value) return
  _editorFlyMode = value
  _flyModeListeners.forEach((fn) => fn(value))
}

export function onEditorFlyModeChange(fn) {
  _flyModeListeners.push(fn)
  return () => {
    _flyModeListeners = _flyModeListeners.filter((l) => l !== fn)
  }
}

let _previewSteps = null
let _previewListeners = []

export function requestPreview(steps) {
  _previewSteps = steps
  _previewListeners.forEach((fn) => fn(steps))
}

export function clearPreview() {
  _previewSteps = null
  _previewListeners.forEach((fn) => fn(null))
}

export function getPreviewSteps() {
  return _previewSteps
}

export function onPreviewChange(fn) {
  _previewListeners.push(fn)
  return () => {
    _previewListeners = _previewListeners.filter((l) => l !== fn)
  }
}
