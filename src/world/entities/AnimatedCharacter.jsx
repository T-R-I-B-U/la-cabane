/* eslint-disable react-hooks/immutability */
import { useEffect, useMemo, useRef } from 'react'
import { useAnimations, useGLTF } from '@react-three/drei'
import { LoopOnce, LoopRepeat } from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { applyAutoTextures } from '../cabane/textureResolver'
import { disposeObject3D } from '../../core/disposeObject3D'

const NO_RAYCAST = () => {}
const CROSSFADE_DURATION = 0.2
const CLIP_END_EPSILON = 1 / 60

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

export function AnimatedCharacter({
  url,
  animationUrl,
  clip,
  animationSequence,
  textureName,
  textureBasePaths,
  ...props
}) {
  const group = useRef()
  const activeActionRef = useRef(null)
  const { scene } = useGLTF(url)
  const { animations } = useGLTF(animationUrl ?? url)
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
    if (animationSequence?.length) return

    const nextClip = pickDefaultClip(actions, names, clip)
    if (!nextClip) return

    const action = actions[nextClip]
    const previousAction = activeActionRef.current

    action.reset()
    action.enabled = true
    action.paused = false
    action.timeScale = 1
    action.clampWhenFinished = false
    action.setLoop(LoopRepeat, Infinity)
    action.play()

    if (previousAction && previousAction !== action) {
      action.crossFadeFrom(previousAction, CROSSFADE_DURATION, false)
    } else {
      action.fadeIn(CROSSFADE_DURATION)
    }

    activeActionRef.current = action

    return () => {
      Object.values(actions).forEach((entry) => entry?.stop())
      activeActionRef.current = null
    }
  }, [actions, names, clip, animationSequence])

  useEffect(() => {
    if (!animationSequence?.length) return

    const timeoutIds = []
    let cancelled = false

    const scheduleStep = (index) => {
      if (cancelled) return

      const step = animationSequence[index]
      const action = actions[step.clip]
      if (!action) return

      const previousAction = activeActionRef.current

      action.reset()
      action.enabled = true
      action.paused = false
      action.clampWhenFinished = !step.duration
      action.setLoop(step.duration ? LoopRepeat : LoopOnce, step.duration ? Infinity : 1)

      if (step.reverse) {
        const clipDuration = action.getClip().duration
        action.timeScale = -1
        action.time = Math.max(clipDuration - CLIP_END_EPSILON, 0)
      } else {
        action.timeScale = 1
        action.time = 0
      }

      action.play()

      if (previousAction && previousAction !== action) {
        action.crossFadeFrom(previousAction, CROSSFADE_DURATION, false)

        timeoutIds.push(
          window.setTimeout(() => {
            previousAction.stop()
          }, CROSSFADE_DURATION * 1000)
        )
      } else {
        action.fadeIn(CROSSFADE_DURATION)
      }

      activeActionRef.current = action

      const durationSeconds = step.duration ?? action.getClip().duration
      timeoutIds.push(
        window.setTimeout(() => {
          scheduleStep((index + 1) % animationSequence.length)
        }, durationSeconds * 1000)
      )
    }

    scheduleStep(0)

    return () => {
      cancelled = true
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId))
      Object.values(actions).forEach((entry) => entry?.stop())
      activeActionRef.current = null
    }
  }, [actions, animationSequence])

  return (
    <group ref={group} {...props}>
      <primitive object={clonedScene} />
    </group>
  )
}
