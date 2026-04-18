import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Perf } from 'r3f-perf'

export default function Scene() {
  return (
    <Canvas
      camera={{ fov: 60, near: 0.1, far: 1000, position: [0, 2, 5] }}
      shadows
    >
      {import.meta.env.DEV && <Perf position="top-left" />}

      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />

      <OrbitControls />
    </Canvas>
  )
}
