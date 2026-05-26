import { Environment } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { use, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { getHdriOption } from './hdriOptions'
import { preferKtx2, loadStandaloneTexture } from '../../world/cabane/textureResolver.js'

// Sun direction offset from its target (world-space, constant).
// Original: light at (-84,72,-34), target at (0,0,0) → offset = (-84,72,-34).
const SUN_OFFSET = new THREE.Vector3(-84, 72, -34)
// Coverage radius around the player — smaller = better shadow resolution.
const SUN_SHADOW_BOUNDS = 50

export function SceneLighting({ activeHdriId, shadowsEnabled = true }) {
  const lightRef = useRef()

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

  // Keep shadow camera centered on player so only nearby visible objects cast shadows.
  useFrame(({ camera }) => {
    const light = lightRef.current
    if (!light) return
    const cx = camera.position.x
    const cz = camera.position.z
    light.position.set(cx + SUN_OFFSET.x, SUN_OFFSET.y, cz + SUN_OFFSET.z)
    light.target.position.set(cx, 0, cz)
    light.target.updateMatrixWorld()
  })

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
        ref={lightRef}
        castShadow={shadowsEnabled}
        color="#ffd7ae"
        intensity={2.2}
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
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
