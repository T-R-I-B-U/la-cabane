import { useEffect, useRef } from 'react'
import { PointerLockControls } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { FLOOR_Y, PLAYER_HEIGHT } from './SceneConfig'

const COLLISION_DIST = 0.6
const MOVE_SPEED = 5.4
const DESCEND_SMOOTHING = 0.3
const ASCEND_SMOOTHING = 0.2
const MAX_FRAME_DELTA = 0.05
const UP = new THREE.Vector3(0, 1, 0)
const DOWN = new THREE.Vector3(0, -1, 0)

// Returns true when a raycast hit should stop the player.
function isBlockingHit(h) {
  if (h.distance >= COLLISION_DIST) return false
  if (h.object.userData.isFloor) return false
  if (h.object.userData.isDoorOpen) return false
  if (h.object.userData.isStair) return false
  return true
}

export function PlayerControls({ canMove = true }) {
  const keys = useRef({})
  const wallRay = useRef(new THREE.Raycaster())
  const floorRay = useRef(new THREE.Raycaster())

  useEffect(() => {
    const down = (e) => {
      keys.current[e.code] = true
    }
    const up = (e) => {
      keys.current[e.code] = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  useFrame((state, delta) => {
    const { camera, scene } = state
    const frameDelta = Math.min(delta, MAX_FRAME_DELTA)

    // --- Floor / stair following ---
    // Cast a ray straight down from just above the player's head.
    // The first walkable surface hit determines the target floor height.
    const fOrigin = camera.position.clone()
    fOrigin.y += 0.5
    floorRay.current.set(fOrigin, DOWN)
    const fHits = floorRay.current.intersectObjects(scene.children, true)
    const walkable = fHits.find((h) => h.object.userData.isFloor || h.object.userData.isStair)
    const targetFloorY = walkable ? walkable.point.y : FLOOR_Y
    const targetCamY = targetFloorY + PLAYER_HEIGHT

    const dy = targetCamY - camera.position.y
    if (dy < 0) {
      // Descending — snap quickly so player doesn't float above steps
      const descendAlpha = 1 - Math.pow(1 - DESCEND_SMOOTHING, frameDelta * 60)
      camera.position.y += dy * descendAlpha
    } else if (dy < 0.6) {
      // Ascending — smooth lerp, limited to realistic step height
      const ascendAlpha = 1 - Math.pow(1 - ASCEND_SMOOTHING, frameDelta * 60)
      camera.position.y += dy * ascendAlpha
    }
    // dy >= 0.6 means a wall is above — don't teleport upward

    if (!canMove) return

    const k = keys.current
    if (!k['KeyW'] && !k['KeyS'] && !k['KeyA'] && !k['KeyD']) return

    const forward = new THREE.Vector3()
    const right = new THREE.Vector3()
    camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()
    right.crossVectors(forward, UP).normalize()

    const wish = new THREE.Vector3()
    const moveStep = MOVE_SPEED * frameDelta
    if (k['KeyW']) wish.addScaledVector(forward, moveStep)
    if (k['KeyS']) wish.addScaledVector(forward, -moveStep)
    if (k['KeyA']) wish.addScaledVector(right, -moveStep)
    if (k['KeyD']) wish.addScaledVector(right, moveStep)

    // Ray heights are relative to current camera Y so they stay correct on stairs
    const footY = camera.position.y - PLAYER_HEIGHT
    const RAY_HEIGHTS = [footY + 0.3, footY + 0.8, camera.position.y]

    // Axis-split: test X and Z independently so the player slides along walls.
    const axes = [new THREE.Vector3(wish.x, 0, 0), new THREE.Vector3(0, 0, wish.z)]
    for (const step of axes) {
      if (step.lengthSq() === 0) continue
      const dir = step.clone().normalize()
      let blocked = false

      for (const rayY of RAY_HEIGHTS) {
        const origin = camera.position.clone()
        origin.y = rayY
        wallRay.current.set(origin, dir)
        if (wallRay.current.intersectObjects(scene.children, true).some(isBlockingHit)) {
          blocked = true
          break
        }
      }

      if (!blocked) camera.position.add(step)
    }
  })

  return <PointerLockControls />
}
