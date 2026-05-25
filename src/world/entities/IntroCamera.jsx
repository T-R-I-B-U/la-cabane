import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getIntroWaypoints, onRegistryChange } from '../../core/cameraRegistry'

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

function toWaypoint(step) {
  return {
    ...step,
    position: new THREE.Vector3(step.position.x, step.position.y, step.position.z),
    target: new THREE.Vector3(step.target.x, step.target.y, step.target.z),
  }
}

function loadWaypoints() {
  return getIntroWaypoints().map(toWaypoint)
}

export default function IntroCamera({ active, shouldAdvance, onEvent }) {
  const { camera } = useThree()
  const cameraRef = useRef(camera)
  const [waypoints, setWaypoints] = useState(loadWaypoints)
  const stepRef = useRef(-1)
  const progressRef = useRef(0)
  const delayRef = useRef(0)
  const waitingRef = useRef(false)
  const advancedRef = useRef(false)
  const readyNotifiedRef = useRef(false)

  useEffect(() => {
    cameraRef.current = camera
  }, [camera])

  useEffect(() => onRegistryChange(() => setWaypoints(loadWaypoints())), [])

  useLayoutEffect(() => {
    if (active && waypoints.length > 0) {
      stepRef.current = -1
      progressRef.current = 0
      delayRef.current = 0
      waitingRef.current = false
      advancedRef.current = false
      readyNotifiedRef.current = false

      // Place the intro camera before the first visible paint so the user
      // does not see the default orbit camera between the loader fade and intro start.
      const introCamera = cameraRef.current
      introCamera.position.copy(waypoints[0].position)
      introCamera.lookAt(waypoints[0].target)
      if (waypoints[0].fov && introCamera.fov !== waypoints[0].fov) {
        introCamera.fov = waypoints[0].fov
        introCamera.updateProjectionMatrix()
      }
      stepRef.current = 0

      if (!readyNotifiedRef.current) {
        readyNotifiedRef.current = true
        onEvent?.('camera:ready')
      }
    }
  }, [active, onEvent, waypoints])

  useEffect(() => {
    if (shouldAdvance && waitingRef.current && !advancedRef.current) {
      waitingRef.current = false
      advancedRef.current = true
    }
  }, [shouldAdvance])

  useFrame((state, rawDelta) => {
    if (!active || waypoints.length === 0) return

    const { camera: frameCamera } = state
    const delta = Math.min(rawDelta, 0.1)

    const step = stepRef.current
    if (step >= waypoints.length - 1) return

    if (waitingRef.current) return

    const from = waypoints[step]
    const to = waypoints[step + 1]

    if (from.delay && delayRef.current < from.delay) {
      delayRef.current += delta
      return
    }

    if (to.duration === 0) {
      frameCamera.position.copy(to.position)
      frameCamera.lookAt(to.target)
      if (to.fov && frameCamera.fov !== to.fov) {
        frameCamera.fov = to.fov
        frameCamera.updateProjectionMatrix()
      }
      stepRef.current += 1
      progressRef.current = 0
      delayRef.current = 0
      if (to.event)
        onEvent?.(to.event, { position: to.position.clone(), target: to.target.clone() })
      return
    }

    progressRef.current = Math.min(progressRef.current + delta / to.duration, 1)
    const t = easeInOut(progressRef.current)

    frameCamera.position.lerpVectors(from.position, to.position, t)
    const lookAt = new THREE.Vector3().lerpVectors(from.target, to.target, t)
    frameCamera.lookAt(lookAt)
    if (to.fov && frameCamera.fov !== to.fov) {
      frameCamera.fov = THREE.MathUtils.lerp(from.fov ?? frameCamera.fov, to.fov, t)
      frameCamera.updateProjectionMatrix()
    }

    if (progressRef.current >= 1) {
      stepRef.current += 1
      progressRef.current = 0
      delayRef.current = 0

      if (to.event) {
        onEvent?.(to.event, { position: to.position.clone(), target: to.target.clone() })
      }

      if (to.waitForInput) {
        waitingRef.current = true
      }
    }
  })

  return null
}
