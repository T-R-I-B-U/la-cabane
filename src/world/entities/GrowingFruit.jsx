import { useMemo, useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { disposeObject3D } from '../../core/disposeObject3D'

const PURPLE = new THREE.Color('#7c3aed')

// Positioned near the platform-facing leaves (~platform height, trunk x/z side)
const DEFAULT_POSITION = [-25.5, 25.5, -9]

export function GrowingFruit({ position = DEFAULT_POSITION }) {
  const { scene } = useGLTF('/models/growingfruit.gltf')

  const cloned = useMemo(() => {
    const c = scene.clone(true)
    c.traverse((obj) => {
      if (!obj.isMesh) return
      obj.material = new THREE.MeshStandardMaterial({
        color: PURPLE,
        roughness: 0.5,
        metalness: 0.0,
      })
    })
    return c
  }, [scene])

  useEffect(() => {
    return () => disposeObject3D(cloned)
  }, [cloned])

  return <primitive object={cloned} position={position} />
}
