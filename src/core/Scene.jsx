import { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Perf } from 'r3f-perf'
import { buildCabane } from '../world/entities/Cabane'

function CabaneMap() {
  const [cabane, setCabane] = useState(null)

  useEffect(() => {
    buildCabane().then(setCabane)
  }, [])

  if (!cabane) return null
  return <primitive object={cabane} />
}

export default function Scene() {
  return (
    <Canvas
      camera={{ fov: 50, near: 0.01, far: 500, position: [20, 15, 30] }}
      shadows
    >
      {import.meta.env.DEV && <Perf position="top-left" />}

      <ambientLight intensity={0.4} />
      <hemisphereLight args={[0xffffff, 0x4f5f66, 1]} />
      <directionalLight position={[10, 20, 8]} intensity={1.1} castShadow />

      <CabaneMap />

      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={0.5}
        maxDistance={200}
        target={[0, 5, 0]}
      />
    </Canvas>
  )
}
