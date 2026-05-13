import * as THREE from 'three'
import { buildNode } from '../cabane/nodeBuilder'
import { buildGroupInstanced } from '../cabane/groupInstancing'
import { modelBaseName } from '../cabane/assetNaming'
import { findNodePosition } from '../cabane/runtime'
export { clearTextureCache } from '../cabane/textureResolver'

// Min geometry dimension (meters) for a mesh to cast shadows.
// Excludes small props (stools, glasses, signs) while keeping large surfaces (walls, trunk, stairs).
const SHADOW_CAST_MIN_DIM = 2.0

// Objects appearing ≥2 times in cabane.json are auto-instanced, except those on this list.
// Exclusions are objects with mesh-level interactions that would break if merged into InstancedMesh
// (e.g. workbench01 is found by getObjectByName for ClickableWorkbench).
const SKIP_GROUPING = new Set(['workbench01'])
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
  performanceMode = false,
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
  const modelBasePaths = ['/models/compressed/', '/models/']
  const textureBasePaths = performanceMode
    ? ['/textures/ktx2/', '/textures/compressed/', '/textures/']
    : ['/textures/ktx2/', '/textures/']

  const nodes = Array.isArray(data) ? data : [data]
  root.userData.hutPosition = findNodePosition(nodes, 'hut01')

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

  // Enable castShadow only on meshes whose geometry is large enough to produce visible shadows.
  // Small props (stools, glasses, signs) are excluded to reduce shadow map draw calls.
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.geometry) return
    if (!obj.geometry.boundingBox) obj.geometry.computeBoundingBox()
    const { max, min } = obj.geometry.boundingBox
    const dim = Math.max(max.x - min.x, max.y - min.y, max.z - min.z)
    if (dim >= SHADOW_CAST_MIN_DIM) {
      obj.castShadow = true
      obj.receiveShadow = true
    }
  })

  attachNestColliders(root.getObjectByName('nest'))
  attachRailingColliders(root.getObjectByName('railling'))
  attachRailingColliders(root.getObjectByName('railling-hut'))

  root.traverse((obj) => {
    if (!obj.isMesh) return
    // Stair steps — walkable ramps instead of vertical walls.
    if (/^stairs-marche/i.test(obj.name)) obj.userData.isStair = true
    // Platform walkable surfaces — floor raycaster must recognise them.
    if (obj.name === 'platform' || obj.name === 'platform-hut') obj.userData.isFloor = true
  })

  return root
}
