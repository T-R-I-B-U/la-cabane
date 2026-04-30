import { DoubleSide } from 'three'
import { FLOOR_Y } from './SceneConfig'

const GROUND_SIZE = 400

export function Floor({ mainFloorRef, hutPosition }) {
  return (
    <>
      <mesh
        ref={mainFloorRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, FLOOR_Y, 0]}
        userData={{ isFloor: true }}
      >
        <planeGeometry args={[400, 400]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[hutPosition[0], -0.02, hutPosition[2]]}
        receiveShadow
        raycast={() => {}}
      >
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
        <meshStandardMaterial color="#d6d1c2" roughness={0.96} metalness={0} side={DoubleSide} />
      </mesh>
    </>
  )
}
