import { Environment, useTexture } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'

export function SceneLighting() {
  const skyTexture = useTexture('/textures/sky.png')
  const backgroundTexture = useMemo(() => {
    const texture = skyTexture.clone()
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }, [skyTexture])

  return (
    <>
      <primitive attach="background" object={backgroundTexture} />
      <Environment preset="apartment" />
      <ambientLight intensity={1} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />
    </>
  )
}
