import { useState, useEffect, useRef } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
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

// hut01 world position from cabane.json — default camera target
const HUT_POS = [-4.7842, 0.8145, -0.7126]

export default function Scene({ onStats, onReady, onError }) {
  return (
    <Canvas
      camera={{ fov: 50, near: 0.01, far: 500, position: [HUT_POS[0] + 8, HUT_POS[1] + 5, HUT_POS[2] + 10] }}
      shadows
    >
      <StatsCollector onStats={onStats} />

      <Environment preset="apartment" backgroundBlurriness={1} />
      <ambientLight intensity={1} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />

      <CabaneMap onReady={onReady} onError={onError} />

      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={0.5}
        maxDistance={200}
        target={HUT_POS}
      />
    </Canvas>
  )
}
