import { FLOOR_Y } from './SceneConfig'
export function Floor({ mainFloorRef }) {
  return (
    <mesh
      ref={mainFloorRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, FLOOR_Y - 0.02, 0]}
      userData={{ isFloor: true }}
    >
      <planeGeometry args={[400, 400]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  )
}
