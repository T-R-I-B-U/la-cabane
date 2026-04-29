import { useEffect, useMemo, useRef } from 'react'
import { useAnimations, useGLTF } from '@react-three/drei'
import { LoopRepeat } from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { applyAutoTextures } from '../cabane/textureResolver'
import { disposeObject3D } from '../../core/disposeObject3D'

const NO_RAYCAST = () => {}

function cloneSingleMaterial(material) {
  const clone = material.clone()

  for (const [key, value] of Object.entries(clone)) {
    if (value?.isTexture) clone[key] = value.clone()
  }

  return clone
}

function cloneMaterial(material) {
  return Array.isArray(material) ? material.map(cloneSingleMaterial) : cloneSingleMaterial(material)
}

function cloneCharacterScene(scene) {
  const clonedScene = clone(scene)

  clonedScene.traverse((obj) => {
    if (!obj.isMesh) return
    obj.geometry = obj.geometry.clone()
    obj.material = cloneMaterial(obj.material)
  })

  return clonedScene
}

function pickDefaultClip(actions, names, defaultClip) {
  if (defaultClip && actions[defaultClip]) return defaultClip

  const idleClip = names.find((name) => /idle/i.test(name))
  if (idleClip) return idleClip

  return names[0] ?? null
}

export function AnimatedCharacter({ url, clip, textureName, textureBasePaths, ...props }) {
  const group = useRef()
  const { scene, animations } = useGLTF(url)
  const clonedScene = useMemo(() => cloneCharacterScene(scene), [scene])
  const { actions, names } = useAnimations(animations, group)

  useEffect(() => {
    clonedScene.traverse((obj) => {
      if (!obj.isMesh) return
      obj.raycast = NO_RAYCAST
      obj.frustumCulled = true
      obj.userData.isCharacter = true
    })

    return () => {
      disposeObject3D(clonedScene)
    }
  }, [clonedScene])

  useEffect(() => {
    if (!textureName) return
    applyAutoTextures(clonedScene, textureName, textureBasePaths)
  }, [clonedScene, textureName, textureBasePaths])

  useEffect(() => {
    const nextClip = pickDefaultClip(actions, names, clip)
    if (!nextClip) return

    Object.values(actions).forEach((entry) => {
      if (!entry) return
      entry.fadeOut(0.15)
      entry.stop()
    })

    const action = actions[nextClip]
    action.reset()
    action.setLoop(LoopRepeat, Infinity)
    action.fadeIn(0.2).play()

    return () => {
      Object.values(actions).forEach((entry) => entry?.stop())
    }
  }, [actions, names, clip])

  return (
    <group ref={group} {...props}>
      <primitive object={clonedScene} />
    </group>
  )
}
