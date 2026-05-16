import { useEffect, useRef } from 'react'
import { PointerLockControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { FLOOR_Y, PLAYER_HEIGHT } from './SceneConfig'

const COLLISION_DIST = 0.6
const MOVE_SPEED = 5.4

const _floorOrigin = new THREE.Vector3()
const _forward = new THREE.Vector3()
const _right = new THREE.Vector3()
const _desiredMove = new THREE.Vector3()
const _axisX = new THREE.Vector3()
const _axisZ = new THREE.Vector3()
const _wallDir = new THREE.Vector3()
const _wallOrigin = new THREE.Vector3()

const WALL_COLLIDER_NODES = new Set([
  'hut01',
  'greenhouse',
  'greenhouse_ground',
  'trunk',
  'nest',
  'house',
  'timeatm',
  'ground-hut',
  'platform',
  'platform-hut',
  'ladder',
  'stairs01',
  'stairs02',
  'railling',
  'railling-hut',
  'juicemachine',
])

function isWallCollider(mesh) {
  if (mesh.userData.isNestWall || mesh.userData.isRailingCollider) return true
  let node = mesh.parent
  while (node) {
    if (WALL_COLLIDER_NODES.has(node.name)) return true
    node = node.parent
  }
  return false
}
const DESCEND_SMOOTHING = 0.3
const ASCEND_SMOOTHING = 0.2
const MAX_FRAME_DELTA = 0.05
const MAX_SNAP_DOWN_DIST = 0.9
const FALL_GRAVITY = 20
const MAX_FALL_SPEED = 12
const FLY_SPEED = 4.8
const UP = new THREE.Vector3(0, 1, 0)
const DOWN = new THREE.Vector3(0, -1, 0)

// Returns true when a raycast hit should stop the player.
function isBlockingCollisionHit(hit) {
  if (hit.distance >= COLLISION_DIST) return false
  if (hit.object.userData.isFloor) return false
  if (hit.object.userData.isDoorOpen) return false
  if (hit.object.userData.isStair) return false
  return true
}

export function PlayerControls({
  canMove = true,
  flyMode = false,
  spawnAt,
  spawnKey,
  lookAtTarget,
  eyeHeight = PLAYER_HEIGHT,
  collisionObjects = [],
  controlsRef,
  lockSelector,
}) {
  const { camera } = useThree()
  const pressedKeysRef = useRef({})
  const wallRaycasterRef = useRef(new THREE.Raycaster())
  const floorRaycasterRef = useRef(new THREE.Raycaster())
  const verticalVelocity = useRef(0)
  const floorMeshesRef = useRef([])
  const wallMeshesRef = useRef([])

  // Apply scripted camera snaps when the active spawn/target changes.
  // spawnKey increments on every spawn so this fires even when position object is the same ref.
  useEffect(() => {
    if (spawnAt) {
      camera.position.set(spawnAt.x, spawnAt.y, spawnAt.z)
    }

    if (lookAtTarget) {
      camera.lookAt(lookAtTarget.x, lookAtTarget.y, lookAtTarget.z)
    }

    verticalVelocity.current = 0
  }, [camera, lookAtTarget, spawnAt, spawnKey])

  // If pointer lock is already active when this mounts (acquired on door click),
  // THREE.PointerLockControls won't know until the next pointerlockchange event.
  // Dispatch on the next frame so Drei has time to attach its internal listener.
  useEffect(() => {
    if (!document.pointerLockElement) return

    let cancelled = false
    let frameId = 0
    let attempts = 0

    const syncLockState = () => {
      if (cancelled || !document.pointerLockElement) return

      document.dispatchEvent(new Event('pointerlockchange'))

      if (controlsRef?.current?.isLocked || attempts >= 3) return

      attempts += 1
      frameId = window.requestAnimationFrame(syncLockState)
    }

    frameId = window.requestAnimationFrame(syncLockState)

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frameId)
    }
  }, [controlsRef])

  useEffect(() => {
    const floor = []
    const wall = []
    for (const obj of collisionObjects) {
      obj.traverse((child) => {
        if (!child.isMesh) return
        if (child.userData.isFloor || child.userData.isStair) {
          floor.push(child)
        } else if (!child.isInstancedMesh && isWallCollider(child)) {
          wall.push(child)
        }
      })
    }
    floorMeshesRef.current = floor
    wallMeshesRef.current = wall
  }, [collisionObjects])

  useEffect(() => {
    const down = (e) => {
      pressedKeysRef.current[e.code] = true
    }
    const up = (e) => {
      pressedKeysRef.current[e.code] = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  useFrame((state, delta) => {
    if (!canMove) return
    if (!flyMode && !controlsRef?.current?.isLocked) return

    const { camera } = state
    const frameDelta = Math.min(delta, MAX_FRAME_DELTA)

    if (!flyMode) {
      _floorOrigin.copy(camera.position)
      _floorOrigin.y += 0.5
      floorRaycasterRef.current.set(_floorOrigin, DOWN)
      const floorHits = floorRaycasterRef.current.intersectObjects(floorMeshesRef.current, false)
      const walkable = floorHits.length > 0 ? floorHits[0] : null
      const targetFloorY = walkable ? walkable.point.y : FLOOR_Y
      const targetCamY = targetFloorY + eyeHeight

      const cameraHeightDelta = targetCamY - camera.position.y
      if (cameraHeightDelta < 0 && Math.abs(cameraHeightDelta) <= MAX_SNAP_DOWN_DIST) {
        const descendAlpha = 1 - Math.pow(1 - DESCEND_SMOOTHING, frameDelta * 60)
        camera.position.y += cameraHeightDelta * descendAlpha
        verticalVelocity.current = 0
      } else if (cameraHeightDelta > 0 && cameraHeightDelta < 0.6) {
        const ascendAlpha = 1 - Math.pow(1 - ASCEND_SMOOTHING, frameDelta * 60)
        camera.position.y += cameraHeightDelta * ascendAlpha
        verticalVelocity.current = 0
      } else if (cameraHeightDelta < 0) {
        verticalVelocity.current = Math.max(
          verticalVelocity.current - FALL_GRAVITY * frameDelta,
          -MAX_FALL_SPEED
        )
        camera.position.y = Math.max(
          camera.position.y + verticalVelocity.current * frameDelta,
          targetCamY
        )
        if (camera.position.y <= targetCamY) verticalVelocity.current = 0
      }
    } else {
      verticalVelocity.current = 0
    }

    const pressedKeys = pressedKeysRef.current
    if (
      !pressedKeys['KeyW'] &&
      !pressedKeys['KeyS'] &&
      !pressedKeys['KeyA'] &&
      !pressedKeys['KeyD'] &&
      !flyMode
    )
      return

    camera.getWorldDirection(_forward)
    _forward.y = 0
    _forward.normalize()
    _right.crossVectors(_forward, UP).normalize()

    const moveStep = MOVE_SPEED * frameDelta
    _desiredMove.set(0, 0, 0)
    if (pressedKeys['KeyW']) _desiredMove.add(_forward)
    if (pressedKeys['KeyS']) _desiredMove.addScaledVector(_forward, -1)
    if (pressedKeys['KeyA']) _desiredMove.addScaledVector(_right, -1)
    if (pressedKeys['KeyD']) _desiredMove.add(_right)
    if (_desiredMove.lengthSq() > 0) _desiredMove.normalize().multiplyScalar(moveStep)

    if (flyMode) {
      const verticalStep = FLY_SPEED * frameDelta
      if (pressedKeys['Space']) _desiredMove.y += verticalStep
      if (pressedKeys['ShiftLeft'] || pressedKeys['ShiftRight']) _desiredMove.y -= verticalStep
      camera.position.add(_desiredMove)
      return
    }

    const footY = camera.position.y - eyeHeight
    const h0 = footY + 0.3
    const h1 = footY + 0.9
    const wallMeshes = wallMeshesRef.current

    _axisX.set(_desiredMove.x, 0, 0)
    _axisZ.set(0, 0, _desiredMove.z)

    for (let a = 0; a < 2; a++) {
      const step = a === 0 ? _axisX : _axisZ
      if (step.lengthSq() === 0) continue
      _wallDir.copy(step).normalize()
      let blocked = false

      for (let hi = 0; hi < 2; hi++) {
        _wallOrigin.copy(camera.position)
        _wallOrigin.y = hi === 0 ? h0 : h1
        wallRaycasterRef.current.set(_wallOrigin, _wallDir)
        if (
          wallRaycasterRef.current.intersectObjects(wallMeshes, false).some(isBlockingCollisionHit)
        ) {
          blocked = true
          break
        }
      }

      if (!blocked) camera.position.add(step)
    }
  })

  return <PointerLockControls ref={controlsRef} selector={lockSelector} />
}
