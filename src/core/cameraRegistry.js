const STORAGE_KEY = 'lacabane:camera-registry:v1'

const INTRO_LABELS = [
  "Vue d'ensemble (départ)",
  'Approche porte',
  'Devant la porte',
  "Porte s'ouvre",
  'Intérieur (arrivée)',
]

function defaultState() {
  return {
    introWaypoints: INTRO_LABELS.map((label, index) => ({ index, label, position: null, target: null })),
    storyPovs: [],
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
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

// ── Module-level state ───────────────────────────────────────────────

let _state = load() ?? defaultState()
let _stateListeners = []

let _liveCamera = null
let _liveListeners = []

let _pendingTeleport = null

// ── Live camera (written by CameraRegistrySync, read by panel) ───────

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

// ── Teleport (written by panel, consumed by CameraRegistrySync) ──────

export function requestTeleport(position, target) {
  _pendingTeleport = { position, target }
}

export function consumeTeleport() {
  const t = _pendingTeleport
  _pendingTeleport = null
  return t
}

// ── Registry state ───────────────────────────────────────────────────

function notify() {
  _stateListeners.forEach((fn) => fn(_state))
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

export function captureIntroWaypoint(index, position, target) {
  _state = {
    ..._state,
    introWaypoints: _state.introWaypoints.map((wp, i) =>
      i === index ? { ...wp, position, target } : wp
    ),
  }
  persist(_state)
  notify()
}

export function addStoryPov(label) {
  const id = `pov-${Date.now()}`
  _state = {
    ..._state,
    storyPovs: [..._state.storyPovs, { id, label, position: null, target: null }],
  }
  persist(_state)
  notify()
}

export function captureStoryPov(id, position, target) {
  _state = {
    ..._state,
    storyPovs: _state.storyPovs.map((pov) =>
      pov.id === id ? { ...pov, position, target } : pov
    ),
  }
  persist(_state)
  notify()
}

export function renameStoryPov(id, label) {
  _state = {
    ..._state,
    storyPovs: _state.storyPovs.map((pov) => (pov.id === id ? { ...pov, label } : pov)),
  }
  persist(_state)
  notify()
}

export function removeStoryPov(id) {
  _state = {
    ..._state,
    storyPovs: _state.storyPovs.filter((pov) => pov.id !== id),
  }
  persist(_state)
  notify()
}

// ── Export ───────────────────────────────────────────────────────────

function vec(v) {
  if (!v) return 'new THREE.Vector3(0, 0, 0) /* non capturé */'
  return `new THREE.Vector3(${v.x}, ${v.y}, ${v.z})`
}

export function exportAsJS() {
  const lines = ['// ── Intro waypoints (IntroCamera.jsx) ──────────────────────────────']
  _state.introWaypoints.forEach((wp, i) => {
    lines.push(`// WP${i} — ${wp.label}`)
    lines.push(`position: ${vec(wp.position)},`)
    lines.push(`target: ${vec(wp.target)},`)
  })

  if (_state.storyPovs.length > 0) {
    lines.push('')
    lines.push('// ── Story POVs ─────────────────────────────────────────────────────')
    lines.push('export const STORY_CAMERA_POVS = {')
    _state.storyPovs.forEach((pov) => {
      lines.push(`  '${pov.id}': { // ${pov.label}`)
      lines.push(`    position: ${vec(pov.position)},`)
      lines.push(`    target: ${vec(pov.target)},`)
      lines.push('  },')
    })
    lines.push('}')
  }

  return lines.join('\n')
}
