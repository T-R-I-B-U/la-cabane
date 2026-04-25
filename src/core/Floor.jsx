import { FLOOR_Y } from './SceneConfig'

export function Floor() {
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
