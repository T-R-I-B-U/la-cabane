import { Environment } from '@react-three/drei'
import { use, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { getHdriOption } from './hdriOptions'
import { preferKtx2, loadStandaloneTexture } from '../../world/cabane/textureResolver.js'

const SUN_POSITION = [-84, 72, -34]
const SUN_SHADOW_BOUNDS = 65


export function SceneLighting({ activeHdriId, shadowsEnabled = true }) {
  const skyTexture = use(
    loadStandaloneTexture(preferKtx2('/textures/sky.png'), { colorSpace: THREE.SRGBColorSpace })
  )
  const activeHdri = getHdriOption(activeHdriId)
  const environmentIntensity = activeHdri?.file ? (activeHdri.intensity ?? 0.32) : 0.28
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
        <Environment files={activeHdri.file} environmentIntensity={environmentIntensity} />
      ) : (
        <Environment preset={activeHdri.preset} environmentIntensity={environmentIntensity} />
      )}
      <ambientLight intensity={0.1} color="#f1dcc8" />
      <hemisphereLight intensity={0.42} color="#ffd8bf" groundColor="#705f4f" />
      <directionalLight
        castShadow={shadowsEnabled}
        color="#ffd7ae"
        intensity={2.2}
        position={SUN_POSITION}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.00018}
        shadow-normalBias={0.032}
      >
        <orthographicCamera
          attach="shadow-camera"
          args={[
            -SUN_SHADOW_BOUNDS,
            SUN_SHADOW_BOUNDS,
            SUN_SHADOW_BOUNDS,
            -SUN_SHADOW_BOUNDS,
            5,
            200,
          ]}
        />
      </directionalLight>
    </>
  )
}
