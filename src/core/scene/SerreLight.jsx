import { useMemo } from 'react'
import * as THREE from 'three'

// Warm sunbeams entering the greenhouse, aligned with the global sun direction
// (SUN_POSITION in SceneLighting points from -x / high-y, so beams travel +x and down).
const SUN_COLOR = '#ffe0b0'

// [lightPosition, floorTarget] pairs spread across the serre interior.
const BEAMS = [
  [
    [-48, 9, -42],
    [-43, 0, -45],
  ],
  [
    [-43, 9, -40],
    [-37, 0, -43],
  ],
  [
    [-37, 9, -42],
    [-31, 0, -45],
  ],
]

export function SerreLight() {
  const targets = useMemo(
    () =>
      BEAMS.map(([, t]) => {
        const o = new THREE.Object3D()
        o.position.set(t[0], t[1], t[2])
        return o
      }),
    []
  )

  return (
    <>
      {/* Soft warm fill so the whole serre reads as sunlit, not just the beams. */}
      <pointLight
        position={[-38, 6, -43]}
        color={SUN_COLOR}
        intensity={28}
        distance={32}
        decay={1.4}
      />
      {BEAMS.map(([pos], i) => (
        <group key={i}>
          <primitive object={targets[i]} />
          <spotLight
            position={pos}
            target={targets[i]}
            color={SUN_COLOR}
            intensity={22}
            angle={0.7}
            penumbra={0.9}
            distance={28}
            decay={1.2}
          />
        </group>
      ))}
    </>
  )
}
