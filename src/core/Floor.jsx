import { useEffect, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import { DoubleSide, RepeatWrapping, SRGBColorSpace } from 'three'
import { FLOOR_Y } from './SceneConfig'

const GROUND_SIZE = 400

export function Floor({ mainFloorRef, hutPosition }) {
  const grassTexture = useTexture('/textures/grass.png')
  const tiledGrassTexture = useMemo(() => {
    if (!grassTexture) return null
    const texture = grassTexture.clone()
    texture.colorSpace = SRGBColorSpace
    texture.wrapS = RepeatWrapping
    texture.wrapT = RepeatWrapping
    texture.repeat.set(96, 96)
    texture.needsUpdate = true
    return texture
  }, [grassTexture])

  useEffect(() => {
    return () => tiledGrassTexture?.dispose()
  }, [tiledGrassTexture])

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
        <meshStandardMaterial
          color="#ffffff"
          map={tiledGrassTexture}
          roughness={0.96}
          metalness={0}
          side={DoubleSide}
        />
      </mesh>
    </>
  )
}
