const STORAGE_KEY = 'lacabane:camera-registry:v2'

const DEFAULT_CONFIG = {
  cameras: [
    {
      id: 'intro.start',
      label: "Vue d'ensemble",
      group: 'intro',
      position: { x: -86.0976, y: 25.4802, z: -18.5007 },
      target: { x: -81.3482, y: 24.8106, z: -17.0885 },
      fov: 60,
    },
    {
      id: 'intro.doorApproach',
      label: 'Approche porte',
      group: 'intro',
      position: { x: -45.2254, y: 7.9636, z: -3.7824 },
      target: { x: -40.5723, y: 7.0374, z: -2.2041 },
      fov: 60,
    },
    {
      id: 'intro.doorWait',
      label: 'Devant la porte',
      group: 'intro',
      position: { x: -31.2129, y: 3.4266, z: 0.0451 },
      target: { x: -26.5125, y: 2.7967, z: 1.629 },
      fov: 60,
    },
    {
      id: 'intro.doorOpen',
      label: "Porte s'ouvre",
      group: 'intro',
      position: { x: -25.5301, y: 1.5177, z: 1.4477 },
      target: { x: -20.5305, y: 1.4661, z: 1.4128 },
      fov: 60,
    },
    {
      id: 'intro.inside',
      label: 'Intérieur arrivée',
      group: 'intro',
      position: { x: -15.4092, y: 1.5177, z: 1.2544 },
      target: { x: -10.5644, y: 2.7531, z: 1.2981 },
      fov: 60,
    },
    {
      id: 'story.accueil',
      label: 'Accueil',
      group: 'story',
      position: { x: -13.5635, y: 1.175, z: 0.5703 },
      target: { x: -15.0973, y: 1.8948, z: -4.1339 },
      fov: 60,
    },
    {
      id: 'story.atelier',
      label: 'Atelier',
      group: 'story',
      position: { x: -8.812, y: 1.4913, z: -4.6866 },
      target: { x: -4.7302, y: 1.2437, z: -7.5636 },
      fov: 60,
    },
    {
      id: 'story.thomas',
      label: 'Thomas établi',
      group: 'story',
      position: { x: -2.7764, y: 1.4913, z: -4.5645 },
      target: { x: -1.0427, y: 1.1738, z: -9.2435 },
      fov: 60,
    },
    {
      id: 'story.greenhouseFrontDoor',
      label: 'Porte serre',
      group: 'story',
      position: { x: 1.1714, y: 1.4913, z: 1.4495 },
      target: { x: 6.1665, y: 1.7135, z: 1.4397 },
      fov: 60,
    },
    {
      id: 'story.greenhouseCorridor',
      label: 'Couloir serre',
      group: 'story',
      position: { x: 9.7213, y: 1.4913, z: 1.4328 },
      target: { x: 14.699, y: 1.9629, z: 1.4231 },
      fov: 60,
    },
    {
      id: 'story.greenhouseInside',
      label: 'Intérieur serre',
      group: 'story',
      position: { x: 18.8127, y: 1.4913, z: 1.4151 },
      target: { x: 23.8025, y: 1.1738, z: 1.3953 },
      fov: 60,
    },
    {
      id: 'story.greenhouseInsideExit',
      label: 'Sortie serre intérieur',
      group: 'story',
      position: { x: 18.7244, y: 1.4913, z: 1.284 },
      target: { x: 13.7299, y: 1.7235, z: 1.3117 },
      fov: 60,
    },
    {
      id: 'story.stairs01Floor',
      label: 'Escalier 01 bas',
      group: 'story',
      position: { x: 0.3231, y: 1.4913, z: 4.6083 },
      target: { x: -2.996, y: 2.2803, z: 8.2635 },
      fov: 60,
    },
    {
      id: 'story.stairs01Top',
      label: 'Escalier 01 haut',
      group: 'story',
      position: { x: -5.5099, y: 4.6038, z: 10.8004 },
      target: { x: -6.8031, y: 4.6356, z: 5.9707 },
      fov: 60,
    },
    {
      id: 'story.greenhouseCorridorExit',
      label: 'Sortie couloir serre',
      group: 'story',
      position: { x: 9.9933, y: 1.4913, z: 1.4422 },
      target: { x: 4.9948, y: 1.5536, z: 1.5499 },
      fov: 60,
    },
    {
      id: 'story.greenhouseFrontDoorExit',
      label: 'Sortie porte serre',
      group: 'story',
      position: { x: 0.6673, y: 1.4913, z: 1.9876 },
      target: { x: -3.6265, y: 1.6036, z: 4.5471 },
      fov: 60,
    },
    {
      id: 'story.serreZoe',
      label: 'Serre Zoe',
      group: 'story',
      position: { x: 27.0794, y: 1.4913, z: 1.4649 },
      target: { x: 32.0149, y: 0.8553, z: 1.9504 },
      fov: 60,
    },
    {
      id: 'story.serreRaspberry',
      label: 'Serre framboises',
      group: 'story',
      position: { x: 29.741, y: 1.4913, z: 0.1516 },
      target: { x: 33.741, y: -0.221, z: -2.3116 },
      fov: 60,
    },
    {
      id: 'story.serreJuice',
      label: 'Serre machine à jus',
      group: 'story',
      position: { x: 33.6517, y: 1.4913, z: 2.0006 },
      target: { x: 38.5216, y: 0.3731, z: 2.186 },
      fov: 60,
    },
    {
      id: 'story.serreJuiceDrink',
      label: 'Serre verre de jus',
      group: 'story',
      position: { x: 37.3073, y: 1.4913, z: -1.4237 },
      target: { x: 37.3882, y: 0.1985, z: 3.4056 },
      fov: 60,
    },
    {
      id: 'arbre.ladderDown',
      label: 'Arbre - bas échelle',
      group: 'arbre',
      position: { x: -4.1487, y: 4.6038, z: 4.7646 },
      target: { x: -5.9731, y: 8.6485, z: 2.46 },
      fov: 60,
    },
    {
      id: 'arbre.atPlatform',
      label: 'Arbre - milieu plateforme haute',
      group: 'arbre',
      position: { x: -7.4445, y: 21.071, z: 1.8279 },
      target: { x: -11.5109, y: 21.3285, z: -1.0701 },
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
      position: { x: -10.1436, y: 4.6038, z: 8.7412 },
      target: { x: -12.1611, y: 5.7747, z: 13.1637 },
      fov: 60,
    },
    {
      id: 'arbre.stairs02Top',
      label: 'Arbre - escalier 02 haut',
      group: 'arbre',
      position: { x: -15.5933, y: 11.6228, z: 20.4581 },
      target: { x: -17.7935, y: 11.4447, z: 24.9444 },
      fov: 60,
    },
    {
      id: 'arbre.nest',
      label: 'Arbre - nid',
      group: 'arbre',
      position: { x: -20.9675, y: 12.4177, z: 22.1332 },
      target: { x: -20.8888, y: 11.4654, z: 27.0411 },
      fov: 60,
    },
    {
      id: 'arbre.outroWP4',
      label: 'Arbre fin - intérieur',
      group: 'arbre',
      position: { x: -15.3621, y: 1.3785, z: 2.8592 },
      target: { x: -20.154, y: 1.3997, z: 1.4317 },
      fov: 60,
    },
    {
      id: 'arbre.outroWP3',
      label: 'Arbre fin - porte',
      group: 'arbre',
      position: { x: -24.7285, y: 1.5695, z: 1.2701 },
      target: { x: -19.7493, y: 1.5593, z: 1.7258 },
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
    {
      id: 'arbre.arbre.haut.echelle',
      label: 'Arbre - haut échelle',
      group: 'arbre',
      position: { x: -4.4295, y: 21.071, z: 3.6871 },
      target: { x: -8.7355, y: 21.0986, z: 1.1458 },
      fov: 60,
    },
  ],
  sequences: {
    intro: [
      { cameraId: 'intro.start', duration: 0, delay: 2 },
      { cameraId: 'intro.doorApproach', duration: 3.5 },
      { cameraId: 'intro.doorWait', duration: 2.5, event: 'wait:door', waitForInput: true },
      { cameraId: 'intro.doorOpen', duration: 2, event: 'door:open' },
      { cameraId: 'intro.inside', duration: 2.5, event: 'inside' },
    ],
  },
  characters: [
    {
      id: 'thomas',
      label: 'Thomas',
      position: { x: -68.5716, y: 0.04, z: -53.7935 },
      floorY: 0.04,
      rotationY: 2.6179938779914944,
      scale: 9,
    },
    {
      id: 'marie',
      label: 'Marie',
      position: { x: -87.0937, y: 9.15, z: -19.5386 },
      floorY: 9.15,
      rotationY: 2.792526803190927,
      scale: 9,
    },
    {
      id: 'zoe',
      label: 'Zoe',
      position: { x: -33.3146, y: 0.04, z: -45.1228 },
      floorY: 0.04,
      rotationY: -1.5707963267948966,
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
