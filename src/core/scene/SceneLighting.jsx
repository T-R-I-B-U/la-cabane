import { Environment } from '@react-three/drei'

export function SceneLighting() {
  return (
    <>
      <Environment preset="apartment" />
      <ambientLight intensity={1} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />
    </>
  )
}
