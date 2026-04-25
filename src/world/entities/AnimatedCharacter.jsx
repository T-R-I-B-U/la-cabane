import { useEffect, useMemo, useRef } from 'react'
import { useAnimations, useGLTF } from '@react-three/drei'
import { LoopRepeat } from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'

const NO_RAYCAST = () => {}

function pickDefaultClip(actions, names, defaultClip) {
  if (defaultClip && actions[defaultClip]) return defaultClip

  const idleClip = names.find((name) => /idle/i.test(name))
  if (idleClip) return idleClip

  return names[0] ?? null
}

export function AnimatedCharacter({ url, clip, ...props }) {
  const group = useRef()
  const { scene, animations } = useGLTF(url)
  const clonedScene = useMemo(() => clone(scene), [scene])
  const { actions, names } = useAnimations(animations, group)

  useEffect(() => {
    clonedScene.traverse((obj) => {
      if (!obj.isMesh) return
      obj.raycast = NO_RAYCAST
      obj.frustumCulled = true
      obj.userData.isCharacter = true
    })
  }, [clonedScene])

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
