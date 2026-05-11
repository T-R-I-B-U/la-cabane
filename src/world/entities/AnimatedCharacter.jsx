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
  const clonedScene = useMemo(() => clone(scene), [scene])
  const { actions, names } = useAnimations(animations, group)

  useEffect(() => {
    clonedScene.traverse((obj) => {
      if (!obj.isMesh) return
      obj.raycast = NO_RAYCAST
      // Skinned meshes need frustum culling disabled — rest-pose bbox desync causes invisible characters
      obj.frustumCulled = false
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

  // Simple looping clip — used by characters without a sequence (e.g. Zoé idle)
  useEffect(() => {
    if (animationSequence?.length) return

    const nextClip = pickDefaultClip(actions, names, clip)
    if (!nextClip) return

    Object.values(actions).forEach((entry) => {
      if (!entry) return
      entry.fadeOut(0.15)
      entry.stop()
    })

    const action = actions[nextClip]
    action.reset()
    action.enabled = true
    action.paused = false
    action.timeScale = 1
    action.clampWhenFinished = false
    action.setLoop(LoopRepeat, Infinity)
    action.fadeIn(0.2).play()
    activeActionRef.current = action

    return () => {
      Object.values(actions).forEach((entry) => entry?.stop())
      activeActionRef.current = null
    }
  }, [actions, names, clip, animationSequence])

  // Sequenced animation — used by characters with multi-step transitions (e.g. Thomas)
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
      timeoutIds.forEach((id) => window.clearTimeout(id))
    }
  }, [actions, animationSequence])

  useEffect(() => {
    return () => {
      Object.values(actions).forEach((entry) => entry?.stop())
      activeActionRef.current = null
    }
  }, [actions])

  return (
    <group ref={group} {...props}>
      <primitive object={clonedScene} />
    </group>
  )
}
