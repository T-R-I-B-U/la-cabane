import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const EASINGS = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => t * (2 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
}

export function StorySequencePlayer({ cameras, pauseAtId = null, onPause, onComplete }) {
  useThree()
  const activeRef = useRef(false)
  const needsInitRef = useRef(false)
  const waypointsRef = useRef([])
  const stepRef = useRef(0)
  const progressRef = useRef(0)
  const delayRef = useRef(0)
  const pausedRef = useRef(false)

  useEffect(() => {
    if (!cameras || cameras.length < 2) {
      activeRef.current = false
      return
    }
    waypointsRef.current = cameras.map((cam) => ({
      ...cam,
      position: new THREE.Vector3(cam.position.x, cam.position.y, cam.position.z),
      target: new THREE.Vector3(cam.target.x, cam.target.y, cam.target.z),
    }))
    stepRef.current = 0
    progressRef.current = 0
    delayRef.current = 0
    pausedRef.current = false
    needsInitRef.current = true
    activeRef.current = true
  }, [cameras])

  useFrame((state, rawDelta) => {
    if (!activeRef.current) return
    const waypoints = waypointsRef.current
    const { camera } = state
    const delta = Math.min(rawDelta, 0.1)

    if (needsInitRef.current) {
      needsInitRef.current = false
      const first = waypoints[0]
      camera.position.copy(first.position)
      camera.lookAt(first.target)
      if (first.fov && first.fov !== camera.fov) {
        camera.fov = first.fov
        camera.updateProjectionMatrix()
      }
    }

    if (pausedRef.current) return

    const step = stepRef.current
    if (step >= waypoints.length - 1) {
      activeRef.current = false
      onComplete?.()
      return
    }

    const from = waypoints[step]
    const to = waypoints[step + 1]

    if (from.delay && delayRef.current < from.delay) {
      delayRef.current += delta
      return
    }

    const duration = to.duration ?? 1.2
    if (duration === 0) {
      camera.position.copy(to.position)
      camera.lookAt(to.target)
      if (to.fov && to.fov !== camera.fov) {
        camera.fov = to.fov
        camera.updateProjectionMatrix()
      }
      stepRef.current += 1
      progressRef.current = 0
      delayRef.current = 0
      if (pauseAtId && to.id === pauseAtId) {
        pausedRef.current = true
        onPause?.()
      }
      return
    }

    progressRef.current = Math.min(progressRef.current + delta / duration, 1)
    const ease = EASINGS[to.easing ?? 'easeInOut']
    const t = ease(progressRef.current)
    camera.position.lerpVectors(from.position, to.position, t)
    camera.lookAt(new THREE.Vector3().lerpVectors(from.target, to.target, t))
    if (from.fov !== to.fov && to.fov) {
      camera.fov = THREE.MathUtils.lerp(from.fov ?? 60, to.fov, t)
      camera.updateProjectionMatrix()
    }

    if (progressRef.current >= 1) {
      stepRef.current += 1
      progressRef.current = 0
      delayRef.current = 0
      if (pauseAtId && to.id === pauseAtId) {
        pausedRef.current = true
        onPause?.()
      }
    }
  })

  return null
}
