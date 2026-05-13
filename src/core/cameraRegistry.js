const STORAGE_KEY = 'lacabane:camera-registry:v2'

const DEFAULT_CONFIG = {
  cameras: [
    {
      id: 'intro.start',
      label: "Vue d'ensemble",
      group: 'intro',
      position: { x: -84.2679, y: 25.15, z: -24.166 },
      target: { x: -9.4607, y: 7.3604, z: -2.0887 },
      fov: 60,
    },
    {
      id: 'intro.doorApproach',
      label: 'Approche porte',
      group: 'intro',
      position: { x: -39.8198, y: 7.2813, z: -8.6382 },
      target: { x: -11.3697, y: 0.642, z: -1.0329 },
      fov: 60,
    },
    {
      id: 'intro.doorWait',
      label: 'Devant la porte',
      group: 'intro',
      position: { x: -31.6806, y: 3.5464, z: -6.5206 },
      target: { x: -11.8577, y: 0.6514, z: 0.0448 },
      fov: 60,
    },
    {
      id: 'intro.doorOpen',
      label: "Porte s'ouvre",
      group: 'intro',
      position: { x: -23.7944, y: 1.5695, z: -5.3764 },
      target: { x: -12.4469, y: 0.5678, z: -5.3619 },
      fov: 60,
    },
    {
      id: 'intro.inside',
      label: 'Intérieur arrivée',
      group: 'intro',
      position: { x: -14.3667, y: 1.3785, z: -5.1169 },
      target: { x: -12.5066, y: 1.7137, z: -5.2008 },
      fov: 60,
    },
    {
      id: 'story.accueil',
      label: 'Accueil',
      group: 'story',
      position: { x: -13.9369, y: 1.1681, z: -6.8462 },
      target: { x: -14.4144, y: 1.275, z: -8.4872 },
      fov: 60,
    },
    {
      id: 'story.atelier',
      label: 'Atelier',
      group: 'story',
      position: { x: -6.6761, y: 1.4422, z: -11.241 },
      target: { x: -5.6005, y: 1.1828, z: -12.2061 },
      fov: 60,
    },
    {
      id: 'story.thomas',
      label: 'Thomas établi',
      group: 'story',
      position: { x: -3.9176, y: 1.5002, z: -11.5091 },
      target: { x: -3.6825, y: 1.4095, z: -11.941 },
      fov: 60,
    },
    {
      id: 'story.greenhouseFrontDoor',
      label: 'Porte serre',
      group: 'story',
      position: { x: 0.1301, y: 1.461, z: -5.2966 },
      target: { x: 16.489, y: 1.3791, z: -5.3887 },
      fov: 60,
    },
    {
      id: 'story.greenhouseCorridor',
      label: 'Couloir serre',
      group: 'story',
      position: { x: 7.1841, y: 1.4256, z: -5.3363 },
      target: { x: 16.489, y: 1.3791, z: -5.3887 },
      fov: 60,
    },
    {
      id: 'story.greenhouseInside',
      label: 'Intérieur serre',
      group: 'story',
      position: { x: 21.6589, y: 1.5532, z: -5.3551 },
      target: { x: 22.4904, y: 1.5065, z: -5.417 },
      fov: 60,
    },
    {
      id: 'story.greenhouseInsideExit',
      label: 'Sortie serre intérieur',
      group: 'story',
      position: { x: 21.6589, y: 1.5532, z: -5.3551 },
      target: { x: 7.1841, y: 1.4256, z: -5.3363 },
      fov: 60,
    },
    {
      id: 'story.stairs01Floor',
      label: 'Escalier 01 bas',
      group: 'story',
      position: { x: 0.0332, y: 1.374, z: -2.2348 },
      target: { x: -5.5832, y: 2.4222, z: 4.8415 },
      fov: 60,
    },
    {
      id: 'story.stairs01Top',
      label: 'Escalier 01 haut',
      group: 'story',
      position: { x: -5.2257, y: 4.6038, z: 3.4697 },
      target: { x: -5.3461, y: 4.574, z: 2.9853 },
      fov: 60,
    },
    {
      id: 'story.greenhouseCorridorExit',
      label: 'Sortie couloir serre',
      group: 'story',
      position: { x: 7.1841, y: 1.4256, z: -5.3363 },
      target: { x: 0.1301, y: 1.461, z: -5.2966 },
      fov: 60,
    },
    {
      id: 'story.greenhouseFrontDoorExit',
      label: 'Sortie porte serre',
      group: 'story',
      position: { x: 0.1301, y: 1.461, z: -5.2966 },
      target: { x: -10, y: 1.461, z: -5.2966 },
      fov: 60,
    },
    {
      id: 'story.serreZoe',
      label: 'Serre Zoe',
      group: 'story',
      position: { x: 23.5, y: 1.6, z: -5.4 },
      target: { x: 26.0, y: 1.4, z: -5.4 },
      fov: 60,
    },
    {
      id: 'story.serreRaspberry',
      label: 'Serre framboises',
      group: 'story',
      position: { x: 31.5, y: 1.9, z: -5.4 },
      target: { x: 32.8, y: 1.4, z: -5.6 },
      fov: 60,
    },
    {
      id: 'story.serreJuice',
      label: 'Serre machine à jus',
      group: 'story',
      position: { x: 33.9, y: 1.5, z: -4.6 },
      target: { x: 38.8, y: 0.45, z: -3.6 },
      fov: 60,
    },
    {
      id: 'story.serreJuiceDrink',
      label: 'Serre verre de jus',
      group: 'story',
      position: { x: 37.3, y: 1.3, z: -8.1 },
      target: { x: 36.9, y: 0.88, z: -3.2 },
      fov: 60,
    },
    {
      id: 'arbre.ladderDown',
      label: 'Arbre - bas échelle',
      group: 'arbre',
      position: { x: -3.8412, y: 4.0818, z: -0.9827 },
      target: { x: -3.9712, y: 4.444, z: -1.3019 },
      fov: 60,
    },
    {
      id: 'arbre.arbre.haut.echelle',
      label: 'Arbre - haut échelle',
      group: 'arbre',
      position: { x: -4.4295, y: 21.071, z: 3.6871 },
      target: { x: -8.7355, y: 21.0986, z: 1.1458 },
      fov: 60,
    },
    {
      id: 'arbre.atPlatform',
      label: 'Arbre - milieu plateforme haute',
      group: 'arbre',
      position: { x: -2.3079, y: 23.7422, z: 20.21005 },
      target: { x: -2.3079, y: 27.2422, z: 19.21005 },
      fov: 60,
    },
    {
      id: 'arbre.atFruitFocus',
      label: 'Arbre - focus fruit plateforme',
      group: 'arbre',
      position: { x: 0.1921, y: 23.7422, z: 22.21005 },
      target: { x: -2.3079, y: 27.2422, z: 19.21005 },
      fov: 60,
    },
    {
      id: 'arbre.stairs02Down',
      label: 'Arbre - escalier 02 bas',
      group: 'arbre',
      position: { x: -7.685, y: 4.3005, z: 2.2315 },
      target: { x: -23.7066, y: 6.2533, z: 8.2345 },
      fov: 60,
    },
    {
      id: 'arbre.stairs02Top',
      label: 'Arbre - escalier 02 haut',
      group: 'arbre',
      position: { x: -15.5754, y: 12.1331, z: 13.8407 },
      target: { x: -15.8063, y: 12.0721, z: 14.28 },
      fov: 60,
    },
    {
      id: 'arbre.nest',
      label: 'Arbre - nid',
      group: 'arbre',
      position: { x: -20.9313, y: 12.1483, z: 17.147 },
      target: { x: -18.168, y: 8.8642, z: 32.0839 },
      fov: 60,
    },
    {
      id: 'arbre.outroWP4',
      label: 'Arbre fin - intérieur',
      group: 'arbre',
      position: { x: -14.3667, y: 1.3785, z: -5.1169 },
      target: { x: -23.7944, y: 1.5695, z: -5.3764 },
      fov: 60,
    },
    {
      id: 'arbre.outroWP3',
      label: 'Arbre fin - porte',
      group: 'arbre',
      position: { x: -23.7944, y: 1.5695, z: -5.3764 },
      target: { x: -12.4469, y: 0.5678, z: -5.3619 },
      fov: 60,
    },
    {
      id: 'arbre.outroWP1',
      label: 'Arbre fin - recul',
      group: 'arbre',
      position: { x: -39.8198, y: 7.2813, z: -8.6382 },
      target: { x: -11.3697, y: 0.642, z: -1.0329 },
      fov: 60,
    },
    {
      id: 'arbre.outroWP0',
      label: 'Arbre fin - extérieur',
      group: 'arbre',
      position: { x: -84.2679, y: 25.15, z: -24.166 },
      target: { x: -9.4607, y: 7.3604, z: -2.0887 },
      fov: 60,
    },
  ],
  sequences: {
    intro: [
      { cameraId: 'intro.start', duration: 0, delay: 2 },
      { cameraId: 'intro.doorApproach', duration: 3.5 },
      { cameraId: 'intro.doorWait', duration: 2.5, event: 'wait:door', waitForInput: true },
      { cameraId: 'intro.doorOpen', duration: 2.0, event: 'door:open' },
      { cameraId: 'intro.inside', duration: 2.5, event: 'inside' },
    ],
  },
  characters: [
    {
      id: 'thomas',
      label: 'Thomas',
      position: { x: -3.0, y: 0.04, z: -13.259 },
      floorY: 0.04,
      rotationY: (150 * Math.PI) / 180,
      scale: 9,
    },
    {
      id: 'marie',
      label: 'Marie',
      position: { x: -20.0, y: 9.15, z: 24.0 },
      floorY: 9.15,
      rotationY: (160 * Math.PI) / 180,
      scale: 9,
    },
    {
      id: 'zoe',
      label: 'Zoe',
      position: { x: 26.0, y: 0.04, z: -5.4 },
      floorY: 0.04,
      rotationY: -Math.PI / 2,
      scale: 11,
    },
  ],
}

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

export function getCameraPose(id) {
  return _state.cameras.find((camera) => camera.id === id) ?? null
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
