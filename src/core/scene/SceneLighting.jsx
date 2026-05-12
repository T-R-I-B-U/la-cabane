import { Environment } from '@react-three/drei'
import { use, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { getHdriOption } from './hdriOptions'
import { preferKtx2, loadStandaloneTexture } from '../../world/cabane/textureResolver.js'

export function SceneLighting({ activeHdriId }) {
  const skyTexture = use(
    loadStandaloneTexture(preferKtx2('/textures/sky.png'), { colorSpace: THREE.SRGBColorSpace })
  )
  const activeHdri = getHdriOption(activeHdriId)
  const backgroundTexture = useMemo(() => {
    if (!skyTexture) return null
    const texture = skyTexture.clone()
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }, [skyTexture])

  useEffect(() => {
    return () => backgroundTexture?.dispose()
  }, [backgroundTexture])

  return (
    <>
      {backgroundTexture && <primitive attach="background" object={backgroundTexture} />}
      {activeHdri?.file ? (
        <Environment files={activeHdri.file} environmentIntensity={activeHdri.intensity} />
      ) : (
        <Environment preset={activeHdri.preset} />
      )}
      <ambientLight intensity={1} />
      <directionalLight position={[10, 70, 10]} intensity={1.5} />
    </>
  )
}
