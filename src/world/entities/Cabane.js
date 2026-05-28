import * as THREE from 'three'
import { buildNode } from '../cabane/nodeBuilder'
import { buildGroupInstanced } from '../cabane/groupInstancing'
import { modelBaseName, normalizeAssetName } from '../cabane/assetNaming'
import { findNodePosition } from '../cabane/runtime'
import { SHARED_SHADOW_CASTER_ROOTS, SHARED_SHADOW_RECEIVER_ROOTS } from '../cabane/shadowConfig'
export { clearTextureCache } from '../cabane/textureResolver'

// Min geometry dimension (meters) for a mesh to cast shadows.
// Excludes small props (stools, glasses, signs) while keeping large surfaces (walls, trunk, stairs).
const SHADOW_CAST_MIN_DIM = 3.5
const SHADOW_CASTER_ROOTS = new Set([
  ...SHARED_SHADOW_CASTER_ROOTS,
  'hut01',
  'trunk',
  'greenhouse',
  'nest',
  'house',
  'platform-hut',
  'workbench01',
])
const FORCED_SMALL_SHADOW_CASTER_ROOTS = new Set([
  'lampe',
  'lampe-mushroom',
  'chair',
  'chair-large',
  'armchair',
  'littletable',
  'stool',
  'basket',
  'plant01',
  'plant01-1',
  'plant02',
  'plant02-1',
  'plant03',
  'plant04',
  'plant05',
  'plant06',
  'plant08',
  'plant08-1',
  'large-table',
  'computer',
  'cushiow',
  'little-table-2',
  'vase',
  'wateringcan',
  'wheelbarrow',
  'bike',
  'bikewheel',
  'balloon',
  'pepper',
  'raspberry',
  'tool01',
  'tool02',
])
const SHADOW_RECEIVER_ROOTS = new Set([
  ...SHARED_SHADOW_RECEIVER_ROOTS,
  'hut01',
  'trunk',
  'greenhouse',
  'nest',
  'house',
  'platform-hut',
  'workbench01',
  'greenhouse_ground',
  'ground-hut',
])
const SHADOW_EXCLUDED_NAMES = [/plane/i, /^background$/i, /poster/i, /^outsideplant0[23]$/i]
const LIGHT_PASSING_SURFACE_NAMES = new Set([
  'glass',
  'cross-window',
  'hut-verre',
  'hut-verriere',
  'hut-verriere-haut',
  'hut-verriere-top',
  'tour-fenetre',
  'fenetre',
  'fenetre1',
  'window01',
  'window02',
  'window03',
])
const LIGHT_PASSING_SURFACE_PATTERNS = [
  /glass/i,
  /window/i,
  /verre/i,
  /verriere/i,
  /verrière/i,
  /fenetre/i,
  /fenêtre/i,
]
const HUT_SKYLIGHT_PATTERNS = [/hut-verr/i]

// Objects appearing ≥2 times in cabane.json are auto-instanced, except those on this list.
// Exclusions are objects with mesh-level interactions that would break if merged into InstancedMesh
// (e.g. workbench01 is found by getObjectByName for ClickableWorkbench).
const SKIP_GROUPING = new Set(['workbench01', 'house', 'poster'])

const HOUSE_TEXTURES = ['house1', 'house2', 'house3']
const POSTER_TEXTURES = ['poster1', 'poster2', 'poster3', 'poster4', 'poster5', 'poster6']

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function assignTexturePool(nodes, baseName, textures) {
  const targets = nodes.filter((n) => modelBaseName(n.name) === baseName)
  // Build a pool large enough to cover all nodes, filling with extra shuffled passes
  const pool = []
  while (pool.length < targets.length) pool.push(...shuffle(textures))
  targets.forEach((node, i) => {
    node.textureName = pool[i]
  })
}
const FORCE_ASSET_GROUPING = new Set(['outsideplant03'])
const MAIN_GROUND_Y_OFFSET = -0.02

const NEST_WALL_INSET = 2
const NEST_DOOR_PADDING = 0.8
const NEST_COLLIDER_THICKNESS = 0.35
const NEST_FLOOR_THICKNESS = 0.08
const NEST_FLOOR_FRONT_PADDING = 0.2
const NEST_FRONT_WALL_OFFSET = 0.2
const NEST_ENTRY_FLOOR_PADDING = 0.25
const RAILING_COLLIDER_HEIGHT = 1.4
const RAILING_COLLIDER_THICKNESS = 0.35

function getLocalBounds(parent, object3d) {
  const bounds = new THREE.Box3()
  const hasBounds = { value: false }
  const inverseParentMatrix = parent.matrixWorld.clone().invert()

  object3d.updateWorldMatrix(true, true)

  object3d.traverse((child) => {
    if (!child.isMesh || !child.geometry) return
    if (!child.geometry.boundingBox) child.geometry.computeBoundingBox()
    if (!child.geometry.boundingBox) return

    const childBounds = child.geometry.boundingBox.clone()
    const childMatrix = inverseParentMatrix.clone().multiply(child.matrixWorld)
    childBounds.applyMatrix4(childMatrix)

    if (!hasBounds.value) {
      bounds.copy(childBounds)
      hasBounds.value = true
      return
    }

    bounds.union(childBounds)
  })

  return hasBounds.value ? bounds : null
}

function createCollider(size, position, userData) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size[0], size[1], size[2]),
    new THREE.MeshBasicMaterial({ visible: false })
  )

  mesh.position.set(position[0], position[1], position[2])
  mesh.userData = { ...userData }
  return mesh
}

function createRailingSegmentCollider(start, end) {
  const delta = new THREE.Vector3().subVectors(end, start)
  const length = Math.hypot(delta.x, delta.z)
  if (length <= 0.05) return null

  const collider = createCollider(
    [RAILING_COLLIDER_THICKNESS, RAILING_COLLIDER_HEIGHT, length],
    [(start.x + end.x) * 0.5, RAILING_COLLIDER_HEIGHT * 0.5, (start.z + end.z) * 0.5],
    { isRailingCollider: true }
  )

  collider.rotation.y = Math.atan2(delta.x, delta.z)
  return collider
}

function forEachMaterial(material, callback) {
  if (Array.isArray(material)) material.forEach(callback)
  else if (material) callback(material)
}

function isLightPassingSurface(obj) {
  let node = obj
  while (node) {
    const nodeName = node.name || ''
    const normalizedName = normalizeAssetName(nodeName)
    if (LIGHT_PASSING_SURFACE_NAMES.has(normalizedName)) return true
    if (LIGHT_PASSING_SURFACE_PATTERNS.some((pattern) => pattern.test(nodeName))) return true
    node = node.parent
  }
  return false
}

function configureLightPassingMaterial(obj) {
  const isHutSkylight = HUT_SKYLIGHT_PATTERNS.some((pattern) => pattern.test(obj.name || ''))

  forEachMaterial(obj.material, (material) => {
    material.transparent = true
    material.opacity = 0.9
    material.depthWrite = isHutSkylight
    material.side = isHutSkylight ? THREE.FrontSide : THREE.DoubleSide
    if ('metalness' in material) material.metalness = 0
    if ('roughness' in material) material.roughness = 0.18
    if ('transmission' in material) {
      material.transmission = isHutSkylight ? 0.08 : 0.18
      material.thickness = 0.08
    }
    material.needsUpdate = true
  })
}

function hasShadowExcludedName(obj) {
  let node = obj
  while (node) {
    if (SHADOW_EXCLUDED_NAMES.some((pattern) => pattern.test(node.name))) return true
    node = node.parent
  }
  return false
}

function isShadowCasterCandidate(obj) {
  if (hasShadowExcludedName(obj)) return false

  let node = obj
  while (node) {
    if (SHADOW_CASTER_ROOTS.has(node.name)) return true
    node = node.parent
  }

  return false
}

function isShadowReceiverCandidate(obj) {
  if (obj.userData.isFloor) return true
  if (hasShadowExcludedName(obj)) return false

  let node = obj
  while (node) {
    if (SHADOW_RECEIVER_ROOTS.has(node.name)) return true
    node = node.parent
  }

  return false
}

function isForcedSmallShadowCaster(obj) {
  let node = obj
  while (node) {
    if (FORCED_SMALL_SHADOW_CASTER_ROOTS.has(node.name)) return true
    node = node.parent
  }

  return false
}

function attachRailingColliders(railingObject) {
  if (!railingObject || railingObject.getObjectByName(`${railingObject.name}-colliders`)) return

  const posts = railingObject.children.filter((child) => /^railling \d+$/i.test(child.name))
  if (posts.length < 2) return
  const postIds = posts.map((post) => Number(post.name.match(/\d+/)?.[0]))
  const segmentLengths = []
  for (let index = 0; index < posts.length - 1; index += 1) {
    if (postIds[index + 1] !== postIds[index] + 1) continue
    segmentLengths.push(posts[index].position.distanceTo(posts[index + 1].position))
  }
  const averageSegmentLength =
    segmentLengths.reduce((total, length) => total + length, 0) / segmentLengths.length
  const maxSegmentLength = averageSegmentLength * 1.75

  const colliders = new THREE.Group()
  colliders.name = `${railingObject.name}-colliders`

  for (let index = 0; index < posts.length - 1; index += 1) {
    if (postIds[index + 1] !== postIds[index] + 1) continue
    const collider = createRailingSegmentCollider(posts[index].position, posts[index + 1].position)
    if (collider) {
      collider.name = `${railingObject.name}-collider-${index}`
      colliders.add(collider)
    }
  }

  const loopLength = posts.at(-1).position.distanceTo(posts[0].position)
  const closesLoop = posts.length > 2 && loopLength <= maxSegmentLength
  if (closesLoop) {
    const collider = createRailingSegmentCollider(posts.at(-1).position, posts[0].position)
    if (collider) {
      collider.name = `${railingObject.name}-collider-loop`
      colliders.add(collider)
    }
  }

  if (colliders.children.length > 0) railingObject.add(colliders)
}

function attachNestColliders(nestObject) {
  if (!nestObject || nestObject.getObjectByName('nest-floor-collider')) return

  nestObject.updateWorldMatrix(true, true)

  const wall = nestObject.getObjectByName('nest_wall')
  const door = nestObject.getObjectByName('nest-door')
  if (!wall || !door) return

  const wallBounds = getLocalBounds(nestObject, wall)
  const doorBounds = getLocalBounds(nestObject, door)
  if (!wallBounds || !doorBounds) return

  const left = wallBounds.min.x + NEST_WALL_INSET
  const right = wallBounds.max.x - NEST_WALL_INSET
  const floorFront = Math.max(
    wallBounds.min.z + NEST_FRONT_WALL_OFFSET,
    doorBounds.max.z - NEST_FLOOR_FRONT_PADDING
  )
  const back = wallBounds.max.z - NEST_WALL_INSET
  const floorWidth = right - left
  const floorDepth = back - floorFront
  if (floorWidth <= 0 || floorDepth <= 0) return

  const floorY = doorBounds.min.y + NEST_FLOOR_THICKNESS * 0.5
  const wallHeight = Math.max(3.2, doorBounds.max.y - doorBounds.min.y + 0.8)
  const wallY = floorY + wallHeight * 0.5
  const frontWallZ = wallBounds.min.z + NEST_FRONT_WALL_OFFSET
  const sideWallDepth = floorDepth + NEST_COLLIDER_THICKNESS * 2
  const gapMinX = Math.max(left + 0.4, doorBounds.min.x - NEST_DOOR_PADDING)
  const gapMaxX = Math.min(right - 0.4, doorBounds.max.x + NEST_DOOR_PADDING)

  const colliders = new THREE.Group()
  colliders.name = 'nest-colliders'

  const floorCollider = createCollider(
    [floorWidth, NEST_FLOOR_THICKNESS, floorDepth],
    [(left + right) * 0.5, floorY, (floorFront + back) * 0.5],
    { isFloor: true }
  )
  floorCollider.name = 'nest-floor-collider'
  colliders.add(floorCollider)

  const entryFloorDepth = floorFront - frontWallZ + NEST_ENTRY_FLOOR_PADDING
  if (entryFloorDepth > 0.05) {
    const entryFloorWidth = gapMaxX - gapMinX
    if (entryFloorWidth > 0.2) {
      const entryFloorCollider = createCollider(
        [entryFloorWidth, NEST_FLOOR_THICKNESS, entryFloorDepth],
        [
          (gapMinX + gapMaxX) * 0.5,
          floorY,
          frontWallZ + entryFloorDepth * 0.5 - NEST_ENTRY_FLOOR_PADDING * 0.5,
        ],
        { isFloor: true }
      )
      entryFloorCollider.name = 'nest-entry-floor-collider'
      colliders.add(entryFloorCollider)
    }
  }

  const leftWall = createCollider(
    [NEST_COLLIDER_THICKNESS, wallHeight, sideWallDepth],
    [left - NEST_COLLIDER_THICKNESS * 0.5, wallY, (floorFront + back) * 0.5],
    { isNestWall: true }
  )
  leftWall.name = 'nest-left-wall-collider'
  colliders.add(leftWall)

  const rightWall = createCollider(
    [NEST_COLLIDER_THICKNESS, wallHeight, sideWallDepth],
    [right + NEST_COLLIDER_THICKNESS * 0.5, wallY, (floorFront + back) * 0.5],
    { isNestWall: true }
  )
  rightWall.name = 'nest-right-wall-collider'
  colliders.add(rightWall)

  const backWall = createCollider(
    [floorWidth + NEST_COLLIDER_THICKNESS * 2, wallHeight, NEST_COLLIDER_THICKNESS],
    [(left + right) * 0.5, wallY, back + NEST_COLLIDER_THICKNESS * 0.5],
    { isNestWall: true }
  )
  backWall.name = 'nest-back-wall-collider'
  colliders.add(backWall)

  const frontLeftWidth = gapMinX - left
  if (frontLeftWidth > 0.2) {
    const frontLeftWall = createCollider(
      [frontLeftWidth, wallHeight, NEST_COLLIDER_THICKNESS],
      [left + frontLeftWidth * 0.5, wallY, frontWallZ],
      { isNestWall: true }
    )
    frontLeftWall.name = 'nest-front-left-wall-collider'
    colliders.add(frontLeftWall)
  }

  const frontRightWidth = right - gapMaxX
  if (frontRightWidth > 0.2) {
    const frontRightWall = createCollider(
      [frontRightWidth, wallHeight, NEST_COLLIDER_THICKNESS],
      [gapMaxX + frontRightWidth * 0.5, wallY, frontWallZ],
      { isNestWall: true }
    )
    frontRightWall.name = 'nest-front-right-wall-collider'
    colliders.add(frontRightWall)
  }

  nestObject.add(colliders)
}

/**
 * Build the full scene graph from cabane.json.
 * Returns a THREE.Group ready to be added to the scene (or used with <primitive>).
 *
 * Missing models become empty pivots — the hierarchy still places correctly.
 */
export async function buildCabane({
  modelQuality = 'compressed2',
  jsonPath = '/cabane.json',
  jsonData = null,
} = {}) {
  let data = jsonData
  if (!data) {
    const res = await fetch(jsonPath)
    if (!res.ok) throw new Error(`Cannot load ${jsonPath} (${res.status})`)
    data = await res.json()
  }

  const root = new THREE.Group()
  root.name = 'cabane'
  const modelBasePaths =
    modelQuality === 'compressed2'
      ? ['/models/compressed2/', '/models/compressed/', '/models/']
      : modelQuality === 'compressed'
        ? ['/models/compressed/', '/models/']
        : ['/models/']
  const textureBasePaths = ['/textures/ktx2/', '/textures/compressed/', '/textures/']

  const nodes = Array.isArray(data) ? data : [data]
  root.userData.hutPosition = findNodePosition(nodes, 'hut01')
  assignTexturePool(nodes, 'house', HOUSE_TEXTURES)
  assignTexturePool(nodes, 'poster', POSTER_TEXTURES)

  // Group same-name non-InstancedMesh nodes for auto-instancing.
  // Nodes with ≥2 occurrences share one InstancedMesh group instead of N separate draw calls.
  const groups = new Map()
  const instancedNodes = []
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (node.type === 'InstancedMesh') {
      instancedNodes.push({ node, index: i })
    } else {
      const baseName = modelBaseName(node.name)
      const groupKey = FORCE_ASSET_GROUPING.has(baseName) ? baseName : node.name
      if (!groups.has(groupKey)) groups.set(groupKey, [])
      groups.get(groupKey).push({ node, index: i })
    }
  }

  const buildTasks = []
  const taskMeta = []
  for (const [groupName, entries] of groups) {
    const groupNodes = entries.map((e) => e.node)
    if (groupNodes.length >= 2 && !SKIP_GROUPING.has(groupName)) {
      buildTasks.push(
        buildGroupInstanced(groupName, groupNodes, { modelBasePaths, textureBasePaths })
      )
      taskMeta.push({ name: groupName, index: entries[0].index })
    } else {
      for (const { node, index } of entries) {
        buildTasks.push(buildNode(node, { modelBasePaths, textureBasePaths }))
        taskMeta.push({ name: node.name, index })
      }
    }
  }
  for (const { node, index } of instancedNodes) {
    buildTasks.push(buildNode(node, { modelBasePaths, textureBasePaths }))
    taskMeta.push({ name: node.name, index })
  }

  const built = await Promise.all(buildTasks)
  for (let i = 0; i < built.length; i++) {
    const obj = built[i]
    if (!obj) continue
    root.add(obj)
    obj.userData.visibilityId = `${taskMeta[i].name}#${taskMeta[i].index}`
  }

  const mainGround = root.getObjectByName('mainGround')
  if (mainGround) mainGround.position.y += MAIN_GROUND_Y_OFFSET

  // Single pass: shadow config + walkable surface flags.
  // Runs before attachColliders so invisible collider boxes don't inherit shadow settings.
  root.traverse((obj) => {
    if (obj.isMesh) {
      if (/^stairs-marche/i.test(obj.name)) obj.userData.isStair = true
      if (obj.name === 'platform' || obj.name === 'platform-hut') obj.userData.isFloor = true
    }
    if (!obj.isMesh || !obj.geometry) return
    if (isLightPassingSurface(obj)) {
      obj.receiveShadow = false
      obj.castShadow = false
      configureLightPassingMaterial(obj)
      return
    }
    forEachMaterial(obj.material, (mat) => {
      if ('roughness' in mat) { mat.roughness = 1; mat.roughnessMap = null }
      if ('metalness' in mat) { mat.metalness = 0; mat.metalnessMap = null }
      if ('envMapIntensity' in mat) mat.envMapIntensity = 0
      mat.needsUpdate = true
    })
    obj.receiveShadow = isShadowReceiverCandidate(obj)
    obj.castShadow = false
    if (!isShadowCasterCandidate(obj)) return
    if (isForcedSmallShadowCaster(obj)) {
      obj.castShadow = true
      return
    }
    if (!obj.geometry.boundingBox) obj.geometry.computeBoundingBox()
    const { max, min } = obj.geometry.boundingBox
    const dim = Math.max(max.x - min.x, max.y - min.y, max.z - min.z)
    if (dim >= SHADOW_CAST_MIN_DIM) obj.castShadow = true
  })

  attachNestColliders(root.getObjectByName('nest'))
  attachRailingColliders(root.getObjectByName('railling'))
  attachRailingColliders(root.getObjectByName('railling-hut'))

  return root
}
