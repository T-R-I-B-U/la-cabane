import { useState, useEffect, useRef } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, PointerLockControls, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { buildCabane } from '../world/entities/Cabane'
import { SlidingDoors } from '../world/entities/SlidingDoors'


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
    buildCabane()
      .then((group) => {
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
      .catch((err) => onError(err.message ?? String(err)))
  }, [onReady, onError, onCabaneLoaded])

  if (!cabane) return null
  return <primitive object={cabane} />
}

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

const FLOOR_Y = 0.04         // top face of hut base ring
const PLAYER_HEIGHT = 1.4
const COLLISION_DIST = 0.6
const SPEED = 0.09
const STEP_CLIMB_SPEED = 0.12 // max Y gain per frame when stepping up
const FLOOR_SNAP = 0.06       // lerp factor when descending (lower = smoother)
const MAX_FALL_SPEED = 0.18   // max Y loss per frame
const UP = new THREE.Vector3(0, 1, 0)
const DOWN = new THREE.Vector3(0, -1, 0)

function PlayerControls() {
  const keys = useRef({})
  const wallRay = useRef(new THREE.Raycaster())
  const floorRay = useRef(new THREE.Raycaster(new THREE.Vector3(), DOWN, 0, PLAYER_HEIGHT + 3))
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
      camera.position.set(PLAYER_SPAWN.x, FLOOR_Y + PLAYER_HEIGHT, PLAYER_SPAWN.z)
      camera.lookAt(HUT_POS[0], FLOOR_Y + PLAYER_HEIGHT, HUT_POS[2])
      initialized.current = true
    }

    // Floor detection — drives stair climbing and terrain following
    floorRay.current.set(camera.position, DOWN)
    const downHits = floorRay.current.intersectObjects(scene.children, true)
    const floorHit = downHits.find((h) => !h.object.userData.isDoorOpen)

    if (floorHit) {
      const targetY = floorHit.point.y + PLAYER_HEIGHT
      if (targetY > camera.position.y) {
        // Climbing — capped to avoid teleporting over tall walls
        camera.position.y += Math.min(targetY - camera.position.y, STEP_CLIMB_SPEED)
      } else {
        // Descending / flat — capped lerp to avoid abrupt drops
        const fallDelta = (targetY - camera.position.y) * FLOOR_SNAP
        camera.position.y += Math.max(fallDelta, -MAX_FALL_SPEED)
      }
    } else {
      // No floor within range — fall back to base level, capped
      const fallDelta = (FLOOR_Y + PLAYER_HEIGHT - camera.position.y) * FLOOR_SNAP
      camera.position.y += Math.max(fallDelta, -MAX_FALL_SPEED)
    }

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

    // Wall rays: barrier-low (35 cm above floor) clears stair risers (~0.26 m) but blocks
    // barriers; mid-body and head catch walls at all heights.
    const RAY_OFFSETS = [-(PLAYER_HEIGHT - 0.35), -PLAYER_HEIGHT / 2, -0.1]
    const axes = [new THREE.Vector3(wish.x, 0, 0), new THREE.Vector3(0, 0, wish.z)]

    for (const step of axes) {
      if (step.lengthSq() === 0) continue
      const dir = step.clone().normalize()
      let blocked = false

      for (const relDy of RAY_OFFSETS) {
        const origin = camera.position.clone()
        origin.y += relDy
        wallRay.current.set(origin, dir)
        const hits = wallRay.current.intersectObjects(scene.children, true)
        if (
          hits.some(
            (h) =>
              h.distance < COLLISION_DIST &&
              !h.object.userData.isFloor &&
              !h.object.userData.isDoorOpen
          )
        ) {
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

// Spawn devant l'entrée du hut, à hauteur des yeux
const PLAYER_SPAWN = new THREE.Vector3(HUT_POS[0], FLOOR_Y + PLAYER_HEIGHT, HUT_POS[2] + 6)

export default function Scene({ onStats, onReady, onError, playerMode, debugDoors }) {
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

      <Environment preset="apartment" />
      <ambientLight intensity={1} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />

      <Floor />

      <CabaneMap onReady={onReady} onError={onError} onCabaneLoaded={setCabane} />

      {/* Portes coulissantes — actives en mode joueur et en mode orbite */}
      <SlidingDoors
        cabane={cabane}
        playerMode={playerMode}
        controlsRef={controlsRef}
        debug={debugDoors}
      />

      {playerMode ? (
        <PlayerControls />
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
