import { useMemo, useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { disposeObject3D } from '../../core/disposeObject3D'
import { applyAutoTextures } from '../cabane/textureResolver'

const DEFAULT_POSITION = [-25.5, 25.5, -9]

export function DecorativeFruit({ position = DEFAULT_POSITION }) {
  const { scene } = useGLTF('/models/growingfruit.gltf')

  const cloned = useMemo(() => {
    const c = scene.clone(true)
    applyAutoTextures(c, 'growingfruit', ['/textures/'])
    const box = new THREE.Box3().setFromObject(c)
    c.position.y = -box.max.y
    return c
  }, [scene])

  useEffect(() => () => disposeObject3D(cloned), [cloned])

  return (
    <group position={position}>
      <primitive object={cloned} />
    </group>
  )
}
