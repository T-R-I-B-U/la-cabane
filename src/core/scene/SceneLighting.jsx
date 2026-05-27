import { Environment } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { use, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { getHdriOption } from './hdriOptions'
import { preferKtx2, loadStandaloneTexture } from '../../world/cabane/textureResolver.js'

// Sun direction offset from its target (world-space, constant).
// Original: light at (-84,72,-34), target at (0,0,0) → offset = (-84,72,-34).
const SUN_OFFSET = new THREE.Vector3(-84, 72, -34)

// Exterior mode: large static frustum centred on origin.
const EXTERIOR_BOUNDS = 150

// Player mode: small frustum following the player, snapped to texel grid.
const PLAYER_BOUNDS = 50
const PLAYER_TEXEL = (2 * PLAYER_BOUNDS) / 512
// Re-render only when the player moves more than this distance (metres).
const PLAYER_THRESHOLD_SQ = 8 * 8

export function SceneLighting({ activeHdriId, shadowsEnabled = true, firstPersonMode = false }) {
  const lightRef = useRef()
  const lastShadowPos = useRef(new THREE.Vector2(Infinity, Infinity))
  const lastMode = useRef(null)

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

  useFrame(({ camera }) => {
    const light = lightRef.current
    if (!light) return

    const modeChanged = firstPersonMode !== lastMode.current

    if (!firstPersonMode) {
      // Exterior: fixed frustum over the whole scene, only reposition on mode change.
      if (!modeChanged) return
      light.shadow.camera.left = -EXTERIOR_BOUNDS
      light.shadow.camera.right = EXTERIOR_BOUNDS
      light.shadow.camera.top = EXTERIOR_BOUNDS
      light.shadow.camera.bottom = -EXTERIOR_BOUNDS
      light.shadow.camera.updateProjectionMatrix()
      light.position.set(SUN_OFFSET.x, SUN_OFFSET.y, SUN_OFFSET.z)
      light.target.position.set(0, 0, 0)
    } else {
      // Player mode: small frustum following camera, updated every 8 m.
      if (modeChanged) {
        light.shadow.camera.left = -PLAYER_BOUNDS
        light.shadow.camera.right = PLAYER_BOUNDS
        light.shadow.camera.top = PLAYER_BOUNDS
        light.shadow.camera.bottom = -PLAYER_BOUNDS
        light.shadow.camera.updateProjectionMatrix()
        lastShadowPos.current.set(Infinity, Infinity)
      }
      const dx = camera.position.x - lastShadowPos.current.x
      const dz = camera.position.z - lastShadowPos.current.y
      if (!modeChanged && dx * dx + dz * dz < PLAYER_THRESHOLD_SQ) return
      const cx = Math.round(camera.position.x / PLAYER_TEXEL) * PLAYER_TEXEL
      const cz = Math.round(camera.position.z / PLAYER_TEXEL) * PLAYER_TEXEL
      light.position.set(cx + SUN_OFFSET.x, SUN_OFFSET.y, cz + SUN_OFFSET.z)
      light.target.position.set(cx, 0, cz)
      lastShadowPos.current.set(camera.position.x, camera.position.z)
    }

    light.target.updateMatrixWorld()
    lastMode.current = firstPersonMode
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
          args={[-EXTERIOR_BOUNDS, EXTERIOR_BOUNDS, EXTERIOR_BOUNDS, -EXTERIOR_BOUNDS, 5, 200]}
        />
      </directionalLight>
    </>
  )
}
