import { Environment } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { use, useRef } from 'react'
import * as THREE from 'three'
import { getHdriOption } from './hdriOptions'
import { loadStandaloneTexture } from '../../world/cabane/textureResolver.js'

const SUN_POSITION = [-84, 72, -34]
const SUN_SHADOW_BOUNDS = 65

// Render shadow map every frame for the first N frames so async-loaded objects
// are captured, then freeze — light is fixed so result never changes after that.
const SHADOW_WARMUP_FRAMES = 180

export function SceneLighting({ activeHdriId, shadowsEnabled = true }) {
  const warmup = useRef(SHADOW_WARMUP_FRAMES)
  const skyTexture = use(
    loadStandaloneTexture('/textures/sky.png', { colorSpace: THREE.SRGBColorSpace })
  )
  const activeHdri = getHdriOption(activeHdriId)
  const environmentIntensity = activeHdri?.file ? (activeHdri.intensity ?? 0.32) : 0.28

  useFrame(({ gl }) => {
    if (warmup.current > 0) {
      warmup.current -= 1
      return
    }
    // Scene fully loaded — freeze shadow map, never recalculate.
    if (gl.shadowMap.autoUpdate) gl.shadowMap.autoUpdate = false
  })

  return (
    <>
      {skyTexture && <primitive attach="background" object={skyTexture} />}
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
