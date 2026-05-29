import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getCameraPose, onPreviewChange } from './cameraRegistry'

const EASINGS = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => t * (2 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
}

function buildWaypoints(steps) {
  return steps
    .map((step) => {
      const cam = getCameraPose(step.cameraId)
      if (!cam?.position || !cam?.target) return null
      return {
        ...step,
        position: new THREE.Vector3(cam.position.x, cam.position.y, cam.position.z),
        target: new THREE.Vector3(cam.target.x, cam.target.y, cam.target.z),
        fov: cam.fov ?? 60,
      }
    })
    .filter(Boolean)
}

export function CameraPreviewPlayer() {
  const { camera } = useThree()
  const activeRef = useRef(false)
  const waypointsRef = useRef([])
  const stepRef = useRef(0)
  const progressRef = useRef(0)

  useEffect(
    () =>
      onPreviewChange((steps) => {
        if (!steps) {
          activeRef.current = false
          return
        }
        const waypoints = buildWaypoints(steps)
        if (waypoints.length < 2) return
        waypointsRef.current = waypoints
        stepRef.current = 0
        progressRef.current = 0
        activeRef.current = true
        camera.position.copy(waypoints[0].position)
        camera.lookAt(waypoints[0].target)
        if (waypoints[0].fov !== camera.fov) {
          camera.fov = waypoints[0].fov
          camera.updateProjectionMatrix()
        }
      }),
    [camera]
  )

  useFrame((state, rawDelta) => {
    if (!activeRef.current) return
    const waypoints = waypointsRef.current
    const { camera: frameCamera } = state
    const delta = Math.min(rawDelta, 0.1)
    const step = stepRef.current
    if (step >= waypoints.length - 1) {
      activeRef.current = false
      return
    }
    const from = waypoints[step]
    const to = waypoints[step + 1]
    const duration = to.duration ?? 2
    if (duration === 0) {
      frameCamera.position.copy(to.position)
      frameCamera.lookAt(to.target)
      if (to.fov !== frameCamera.fov) {
        frameCamera.fov = to.fov
        frameCamera.updateProjectionMatrix()
      }
      stepRef.current += 1
      progressRef.current = 0
      return
    }
    progressRef.current = Math.min(progressRef.current + delta / duration, 1)
    const ease = EASINGS[to.easing ?? 'easeInOut']
    const t = ease(progressRef.current)
    frameCamera.position.lerpVectors(from.position, to.position, t)
    frameCamera.lookAt(new THREE.Vector3().lerpVectors(from.target, to.target, t))
    if (from.fov !== to.fov) {
      frameCamera.fov = THREE.MathUtils.lerp(from.fov, to.fov, t)
      frameCamera.updateProjectionMatrix()
    }
    if (progressRef.current >= 1) {
      stepRef.current += 1
      progressRef.current = 0
    }
  })

  return null
}
