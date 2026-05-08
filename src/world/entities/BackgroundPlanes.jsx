import { useEffect, useMemo, useRef } from 'react'
import { useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const PLANES = [
  {
    textureIndex: 0,
    offset: [110, 120, 44],
    size: [480, 240],
    rotationY: 20,
    opacity: 0.84,
    parallax: 0.08,
  },
  {
    textureIndex: 1,
    offset: [110, 120, 46],
    size: [480, 240],
    rotationY: 20,
    opacity: 0.76,
    parallax: 0.05,
  },
  {
    textureIndex: 2,
    offset: [110, 120, 48],
    size: [480, 240],
    rotationY: 20,
    opacity: 0.68,
    parallax: 0.03,
  },
]

export function BackgroundPlanes({ hutPosition }) {
  const planeRefs = useRef([])
  const backgroundTexture1 = useTexture('/textures/background-1.png')
  const backgroundTexture2 = useTexture('/textures/background-2.png')
  const backgroundTexture3 = useTexture('/textures/background-3.png')
  const textures = useMemo(() => {
    return [backgroundTexture1, backgroundTexture2, backgroundTexture3].map((backgroundTexture) => {
      if (!backgroundTexture) return null
      const nextTexture = backgroundTexture.clone()
      nextTexture.colorSpace = THREE.SRGBColorSpace
      nextTexture.needsUpdate = true
      return nextTexture
    })
  }, [backgroundTexture1, backgroundTexture2, backgroundTexture3])

  useEffect(() => {
    return () => {
      textures.forEach((texture) => texture?.dispose())
    }
  }, [textures])
  const planeConfigs = useMemo(() => {
    return PLANES.map((plane) => ({
      ...plane,
      basePosition: [
        hutPosition[0] + plane.offset[0],
        plane.offset[1],
        hutPosition[2] + plane.offset[2],
      ],
    }))
  }, [hutPosition])

  useFrame(({ camera }) => {
    for (let index = 0; index < planeConfigs.length; index += 1) {
      const plane = planeRefs.current[index]
      const config = planeConfigs[index]
      if (!plane || !config) continue

      plane.position.x = config.basePosition[0] + camera.position.x * config.parallax
      plane.position.y = config.basePosition[1] + camera.position.y * config.parallax * 0.25
      plane.position.z = config.basePosition[2] + camera.position.z * config.parallax * 0.12
    }
  })

  if (textures.some((texture) => !texture)) return null

  return (
    <group>
      {planeConfigs.map(({ textureIndex, basePosition, size, rotationY, opacity }, index) => (
        <mesh
          key={index}
          ref={(node) => {
            planeRefs.current[index] = node
          }}
          position={basePosition}
          rotation={[0, rotationY, 0]}
          renderOrder={-10}
          raycast={() => {}}
        >
          <planeGeometry args={size} />
          <meshBasicMaterial
            map={textures[textureIndex]}
            transparent
            opacity={opacity}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}
