import { useState, useEffect, useRef } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, PointerLockControls, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { buildCabane } from '../world/entities/Cabane'
import { SlidingDoors } from '../world/entities/SlidingDoors'
import { ClickableDoor } from '../world/entities/ClickableDoor'
import IntroCamera from '../world/entities/IntroCamera'
import { CameraTracker } from './IntroCameraDebug'

// Color code: orange = wall, green = floor, yellow = stair.
function CollisionDebug({ cabane }) {
  const groupRef = useRef()

  useEffect(() => {
    if (!cabane || !groupRef.current) return
    const group = groupRef.current

    cabane.traverse((obj) => {
      if (!obj.isMesh || obj.isInstancedMesh) return
      const color = obj.userData.isFloor ? 0x00ff44 : obj.userData.isStair ? 0xffee00 : 0xff4400
      const edges = new THREE.EdgesGeometry(obj.geometry)
      const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color }))
      line.raycast = () => {} // must not interfere with collision raycasters
      obj.updateWorldMatrix(true, false)
      line.applyMatrix4(obj.matrixWorld)
      group.add(line)
    })

    return () => {
      group.children.forEach((c) => {
        c.geometry.dispose()
        c.material.dispose()
      })
      group.clear()
    }
  }, [cabane])

  return <group ref={groupRef} />
}

function StatsCollector({ onStats }) {
  const { gl } = useThree()
  const frames = useRef(0)
  const lastAt = useRef(0)

  useFrame(() => {
    const now = performance.now()

    if (lastAt.current === 0) {
      lastAt.current = now
      return
    }

    frames.current += 1
    const elapsed = now - lastAt.current

    if (elapsed >= 350) {
      const fps = Math.round((frames.current * 1000) / elapsed)
      const frameMs = elapsed / frames.current
      frames.current = 0
      lastAt.current = now
      const info = gl.info
      onStats({
        fps,
        frameMs,
        calls: info.render.calls,
        triangles: info.render.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
      })
    }
  })

  return null
}

function CabaneMap({ onReady, onError, onCabaneLoaded }) {
  const [cabane, setCabane] = useState(null)

  useEffect(() => {
    let cancelled = false
    buildCabane()
      .then((group) => {
        if (cancelled) return
        let meshes = 0
        let pivots = 0
        group.traverse((obj) => {
          if (obj === group) return
          if (obj.isMesh) meshes++
          else if (obj.userData.cabaneNode) pivots++
        })
        onReady({ meshes, pivots })
        onCabaneLoaded(group)
        setCabane(group)
      })
      .catch((err) => {
        if (cancelled) return
        onError(err.message ?? String(err))
      })
    return () => {
      cancelled = true
    }
  }, [onReady, onError, onCabaneLoaded])

  if (!cabane) return null
  return <primitive object={cabane} />
}

// Top face of the hut's base ring — measured from hut01.gltf vertex data.
const FLOOR_Y = 0.04

function Floor() {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, FLOOR_Y, 0]}
      receiveShadow
      userData={{ isFloor: true }}
    >
      <planeGeometry args={[400, 400]} />
      <meshStandardMaterial color="#e8e0d5" />
    </mesh>
  )
}

const PLAYER_HEIGHT = 1.4
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

function PlayerControls() {
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

// hut01 world position from cabane.json
const HUT_POS = [-5.0111, 2.3616, 0.9556]

const PLAYER_SPAWN = new THREE.Vector3(HUT_POS[0], FLOOR_Y + PLAYER_HEIGHT, HUT_POS[2] + 6)

export default function Scene({
  onStats,
  onReady,
  onError,
  playerMode,
  debugDoors,
  debugCollisions,
  introActive,
  introDoorOpen,
  introWaitingAtDoor,
  introShouldAdvance,
  postIntro,
  postIntroLocked,
  onIntroEvent,
  onCameraChange,
}) {
  const [cabane, setCabane] = useState(null)
  const controlsRef = useRef()

  return (
    <Canvas
      camera={{
        fov: 60,
        near: 0.01,
        far: 500,
        position: [HUT_POS[0] + 22, HUT_POS[1] + 14, HUT_POS[2] + 28],
      }}
      shadows
    >
      <StatsCollector onStats={onStats} />
      {onCameraChange && <CameraTracker controlsRef={controlsRef} onChange={onCameraChange} />}

      <Environment preset="apartment" />
      <ambientLight intensity={1} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />

      <Floor />

      <CabaneMap onReady={onReady} onError={onError} onCabaneLoaded={setCabane} />

      <ClickableDoor
        cabane={cabane}
        active={introWaitingAtDoor}
        onDoorClick={() => onIntroEvent?.('door:clicked')}
      />

      {debugCollisions && <CollisionDebug cabane={cabane} />}

      <SlidingDoors
        cabane={cabane}
        playerMode={playerMode}
        controlsRef={controlsRef}
        debug={debugDoors}
        forceOpen={introDoorOpen}
      />

      {introActive ? (
        <IntroCamera
          active={introActive}
          shouldAdvance={introShouldAdvance}
          onEvent={onIntroEvent}
        />
      ) : playerMode ? (
        <PlayerControls />
      ) : postIntro ? (
        postIntroLocked ? (
          <PointerLockControls />
        ) : null
      ) : (
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.08}
          minDistance={0.5}
          maxDistance={200}
          target={HUT_POS}
        />
      )}
    </Canvas>
  )
}
