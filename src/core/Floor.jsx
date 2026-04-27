import { FLOOR_Y, PLATFORM_POS } from './SceneConfig'

export function Floor({ mainFloorRef, platformFloorRef }) {
  return (
    <>
      <mesh
        ref={mainFloorRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, FLOOR_Y, 0]}
        receiveShadow
        userData={{ isFloor: true }}
      >
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#e8e0d5" />
      </mesh>

      {/* Invisible collider so the player can stand on the platform */}
      <mesh
        ref={platformFloorRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[PLATFORM_POS[0], PLATFORM_POS[1], PLATFORM_POS[2]]}
        userData={{ isFloor: true }}
      >
        <planeGeometry args={[10, 10]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </>
  )
}
