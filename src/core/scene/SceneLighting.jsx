import { useHelper, Environment, useTexture } from '@react-three/drei'
import { useRef, useMemo } from 'react'
import { DirectionalLightHelper } from 'three'
import * as THREE from 'three'
import { getHdriOption } from './hdriOptions'

export function SceneLighting({ activeHdriId }) {
  const directionalLightRef = useRef()

  // Helper debug : affiche la direction et la portée de la lumière dans la scène.
  useHelper(directionalLightRef, DirectionalLightHelper, 2, 'yellow')

  const skyTexture = useTexture('/textures/sky.png')
  const activeHdri = getHdriOption(activeHdriId)
  const backgroundTexture = useMemo(() => {
    if (!skyTexture) return null
    const texture = skyTexture.clone()
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }, [skyTexture])

  return (
    <>
      {backgroundTexture && <primitive attach="background" object={backgroundTexture} />}
      {activeHdri?.file ? (
        <Environment files={activeHdri.file} environmentIntensity={activeHdri.intensity} />
      ) : (
        <Environment preset={activeHdri.preset} />
      )}
      <ambientLight intensity={1} />
      <directionalLight
        ref={directionalLightRef}
        position={[10, 70, 10]}
        intensity={1.5}
        castShadow
      />
    </>
  )
}
