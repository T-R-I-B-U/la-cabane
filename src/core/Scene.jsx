import { useState, useEffect, useRef } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, PointerLockControls, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { buildCabane } from '../world/entities/Cabane'

function StatsCollector({ onStats }) {
  const { gl } = useThree()
  const frames = useRef(0)
  const lastAt = useRef(performance.now())

  useFrame(() => {
    frames.current += 1
    const now = performance.now()
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

function CabaneMap({ onReady, onError }) {
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
        setCabane(group)
      })
      .catch((err) => onError(err.message ?? String(err)))
  }, [onReady, onError])

  if (!cabane) return null
  return <primitive object={cabane} />
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[400, 400]} />
      <meshStandardMaterial color="#ffffff" transparent opacity={0.08} depthWrite={false} />
    </mesh>
  )
}

// WASD movement for player mode
function PlayerControls() {
  const { camera } = useThree()
  const keys = useRef({})
  const SPEED = 0.12

  // Teleport camera to spawn point at ground level in front of the hut.
  useEffect(() => {
    camera.position.copy(PLAYER_SPAWN)
    camera.lookAt(HUT_POS[0], 1.7, HUT_POS[2])
  }, [camera])

  useEffect(() => {
    const down = (e) => { keys.current[e.code] = true }
    const up = (e) => { keys.current[e.code] = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  useFrame(() => {
    const k = keys.current
    const dir = new THREE.Vector3()
    const right = new THREE.Vector3()
    camera.getWorldDirection(dir)
    dir.y = 0
    dir.normalize()
    right.crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize()

    if (k['KeyW']) camera.position.addScaledVector(dir, SPEED)
    if (k['KeyS']) camera.position.addScaledVector(dir, -SPEED)
    if (k['KeyA']) camera.position.addScaledVector(right, -SPEED)
    if (k['KeyD']) camera.position.addScaledVector(right, SPEED)
  })

  return <PointerLockControls />
}

// hut01 world position from cabane.json
const HUT_POS = [-4.7842, 0.8145, -0.7126]

// Player spawn: ground level (~eye height 1.7) in front of the hut entrance
const PLAYER_SPAWN = new THREE.Vector3(HUT_POS[0], 1.7, HUT_POS[2] + 6)

export default function Scene({ onStats, onReady, onError, playerMode }) {
  return (
    <Canvas
      camera={{ fov: 60, near: 0.01, far: 500, position: [HUT_POS[0] + 22, HUT_POS[1] + 14, HUT_POS[2] + 28] }}
      shadows
    >
      <StatsCollector onStats={onStats} />

      <Environment preset="apartment" backgroundBlurriness={1} />
      <ambientLight intensity={1} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />

      <Floor />
      <CabaneMap onReady={onReady} onError={onError} />

      {playerMode ? (
        <PlayerControls />
      ) : (
        <OrbitControls
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
