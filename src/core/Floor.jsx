import { FLOOR_Y } from './SceneConfig'

export function Floor({ mainFloorRef }) {
  return (
    <group>
      <mesh
        ref={mainFloorRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, FLOOR_Y - 0.02, 0]}
        userData={{ isFloor: true }}
      >
        <planeGeometry args={[400, 400]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y - 0.018, 0]}>
        <planeGeometry args={[400, 400]} />
        <shadowMaterial transparent opacity={0.32} />
      </mesh>
    </group>
  )
}
