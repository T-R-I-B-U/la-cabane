import { Environment } from '@react-three/drei'
import { use, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { getHdriOption } from './hdriOptions'
import { preferKtx2, loadStandaloneTexture } from '../../world/cabane/textureResolver.js'

const SUN_POSITION = [-84, 72, -34]
const SUN_SHADOW_BOUNDS = 65

// One entry per lamp/lampe-mushroom mesh in cabane.json — position is 1m above the mesh base.
const LAMP_LIGHTS = [
  // Nest platform
  [-79.0, 12.0, -20.1],
  [-88.1, 12.0, -25.5],
  [-84.8, 11.8, -20.4],
  [-90.3, 12.0, -15.0],
  [-85.2, 12.0, -12.9],
  // Atelier — floor level
  [-81.1, 2.1, -36.3],
  [-84.2, 2.1, -49.7],
  [-65.8, 2.1, -52.0],
  [-74.8, 2.1, -56.9],
  [-79.3, 2.2, -50.9],
  [-71.2, 2.6, -56.1],
  [-73.7, 3.5, -56.2],
  // Atelier — elevated level
  [-64.3, 4.9, -43.2],
  [-67.3, 5.1, -49.5],
  [-67.6, 5.2, -53.7],
  [-70.7, 5.2, -48.0],
]

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
      {LAMP_LIGHTS.map(([x, y, z]) => (
        <pointLight
          key={`${x},${y},${z}`}
          position={[x, y, z]}
          color="#ffdd99"
          intensity={3}
          distance={10}
          decay={2}
        />
      ))}
    </>
  )
}
