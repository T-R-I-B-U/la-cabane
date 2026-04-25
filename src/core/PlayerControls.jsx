import { useEffect, useRef } from 'react'
import { PointerLockControls } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { FLOOR_Y, HUT_POS, PLAYER_HEIGHT, PLAYER_SPAWN } from './SceneConfig'

const COLLISION_DIST = 0.6
const SPEED = 0.09
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

export function PlayerControls() {
  const keys = useRef({})
  const wallRay = useRef(new THREE.Raycaster())
  const floorRay = useRef(new THREE.Raycaster())
  const initialized = useRef(false)

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

  useFrame((state) => {
    const { camera, scene } = state

    if (!initialized.current) {
      camera.position.copy(PLAYER_SPAWN)
      camera.lookAt(HUT_POS[0], FLOOR_Y + PLAYER_HEIGHT, HUT_POS[2])
      initialized.current = true
    }

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
      camera.position.y += dy * 0.3
    } else if (dy < 0.6) {
      // Ascending — smooth lerp, limited to realistic step height
      camera.position.y += dy * 0.2
    }
    // dy >= 0.6 means a wall is above — don't teleport upward

    const k = keys.current
    if (!k['KeyW'] && !k['KeyS'] && !k['KeyA'] && !k['KeyD']) return

    const forward = new THREE.Vector3()
    const right = new THREE.Vector3()
    camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()
    right.crossVectors(forward, UP).normalize()

    const wish = new THREE.Vector3()
    if (k['KeyW']) wish.addScaledVector(forward, SPEED)
    if (k['KeyS']) wish.addScaledVector(forward, -SPEED)
    if (k['KeyA']) wish.addScaledVector(right, -SPEED)
    if (k['KeyD']) wish.addScaledVector(right, SPEED)

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
