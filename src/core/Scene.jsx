import { useState, useEffect, useRef } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, PointerLockControls, Environment, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { buildCabane } from '../world/entities/Cabane'
import { SlidingDoors } from '../world/entities/SlidingDoors'

function SkyBackground() {
  const { scene } = useThree()
  const texture = useTexture('/textures/sky.png')

  useEffect(() => {
    texture.mapping = THREE.EquirectangularReflectionMapping
    scene.background = texture
    return () => { scene.background = null }
  }, [texture, scene])

  return null
}

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
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow userData={{ isFloor: true }}>
      <planeGeometry args={[400, 400]} />
      <meshStandardMaterial color="#e8e0d5" />
    </mesh>
  )
}

const PLAYER_HEIGHT = 2.2
const COLLISION_DIST = 0.6
const SPEED = 0.09
const UP = new THREE.Vector3(0, 1, 0)

function PlayerControls() {
  const { camera, scene } = useThree()
  const keys = useRef({})
  const ray = useRef(new THREE.Raycaster())

  useEffect(() => {
    camera.position.copy(PLAYER_SPAWN)
    camera.lookAt(HUT_POS[0], PLAYER_HEIGHT, HUT_POS[2])
  }, [camera])

  useEffect(() => {
    const down = (e) => { keys.current[e.code] = true }
    const up   = (e) => { keys.current[e.code] = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup',   up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup',   up)
    }
  }, [])

  useFrame(() => {
    const k = keys.current
    if (!k['KeyW'] && !k['KeyS'] && !k['KeyA'] && !k['KeyD']) return

    const forward = new THREE.Vector3()
    const right   = new THREE.Vector3()
    camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()
    right.crossVectors(forward, UP).normalize()

    const wish = new THREE.Vector3()
    if (k['KeyW']) wish.addScaledVector(forward,  SPEED)
    if (k['KeyS']) wish.addScaledVector(forward, -SPEED)
    if (k['KeyA']) wish.addScaledVector(right,   -SPEED)
    if (k['KeyD']) wish.addScaledVector(right,    SPEED)

    const RAY_HEIGHTS = [0.4, 1.1, PLAYER_HEIGHT]
    const axes = [
      new THREE.Vector3(wish.x, 0, 0),
      new THREE.Vector3(0, 0, wish.z),
    ]

    for (const step of axes) {
      if (step.lengthSq() === 0) continue
      const dir = step.clone().normalize()
      let blocked = false

      for (const dy of RAY_HEIGHTS) {
        const origin = camera.position.clone()
        origin.y = dy
        ray.current.set(origin, dir)
        const hits = ray.current.intersectObjects(scene.children, true)
        if (hits.some(
          (h) => h.distance < COLLISION_DIST
            && !h.object.userData.isFloor
            && !h.object.userData.isDoorOpen   // portes ouvertes = pas de collision
        )) {
          blocked = true
          break
        }
      }

      if (!blocked) camera.position.add(step)
    }

    camera.position.y = PLAYER_HEIGHT
  })

  return <PointerLockControls />
}

// hut01 world position from cabane.json
const HUT_POS = [-4.7842, 0.8145, -0.7126]

// Spawn devant l'entrée du hut, à hauteur des yeux
const PLAYER_SPAWN = new THREE.Vector3(HUT_POS[0], PLAYER_HEIGHT, HUT_POS[2] + 6)

export default function Scene({ onStats, onReady, onError, playerMode, debugDoors }) {
  const [cabane, setCabane] = useState(null)
  const controlsRef = useRef()

  return (
    <Canvas
      camera={{ fov: 60, near: 0.01, far: 500, position: [HUT_POS[0] + 22, HUT_POS[1] + 14, HUT_POS[2] + 28] }}
      shadows
    >
      <StatsCollector onStats={onStats} />

      <SkyBackground />
      <Environment preset="apartment" />
      <ambientLight intensity={1} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />

      <Floor />

      <CabaneMap onReady={onReady} onError={onError} onCabaneLoaded={setCabane} />

      {/* Portes coulissantes — actives en mode joueur et en mode orbite */}
      <SlidingDoors cabane={cabane} playerMode={playerMode} controlsRef={controlsRef} debug={debugDoors} />

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
