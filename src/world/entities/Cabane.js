import * as THREE from 'three'
import { buildNode } from '../cabane/nodeBuilder'
import { findNodePosition } from '../cabane/runtime'
export { clearTextureCache } from '../cabane/textureResolver'

const NEST_WALL_INSET = 2
const NEST_DOOR_PADDING = 0.8
const NEST_COLLIDER_THICKNESS = 0.35
const NEST_FLOOR_THICKNESS = 0.08
const NEST_FLOOR_FRONT_PADDING = 0.2
const NEST_FRONT_WALL_OFFSET = 0.2
const NEST_ENTRY_FLOOR_PADDING = 0.25

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
  const modelBasePaths = performanceMode ? ['/models/compressed/', '/models/'] : ['/models/']
  const textureBasePaths = performanceMode
    ? ['/textures/compressed/', '/textures/']
    : ['/textures/']

  const nodes = Array.isArray(data) ? data : [data]
  root.userData.hutPosition = findNodePosition(nodes, 'hut01')
  const built = await Promise.all(
    nodes.map((node) => buildNode(node, { modelBasePaths, textureBasePaths }))
  )
  for (const obj of built) {
    if (obj) root.add(obj)
  }

  attachNestColliders(root.getObjectByName('nest'))

  root.traverse((obj) => {
    if (!obj.isMesh) return
    // Stair steps — walkable ramps instead of vertical walls.
    if (/^stairs-marche/i.test(obj.name)) obj.userData.isStair = true
    // Platform walkable surface — floor raycaster must recognise it.
    if (obj.name === 'platform') obj.userData.isFloor = true
  })

  return root
}
