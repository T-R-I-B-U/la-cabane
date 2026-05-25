import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

export function CinematicPlayer({ active, keypoints }) {
  const { camera } = useThree()

  const startPositionRef = useRef(new THREE.Vector3())
  const startQuaternionRef = useRef(new THREE.Quaternion())
  const targetPositionRef = useRef(new THREE.Vector3())
  const targetQuaternionRef = useRef(new THREE.Quaternion())
  const startFovRef = useRef(60)
  const targetFovRef = useRef(60)
  const elapsedRef = useRef(0)
  const phaseRef = useRef('transition') // 'transition' | 'dwell'
  const indexRef = useRef(0)

  const lookAtMatrix = useMemo(() => new THREE.Matrix4(), [])

  function initTarget(kp) {
    startPositionRef.current.copy(camera.position)
    startQuaternionRef.current.copy(camera.quaternion)
    startFovRef.current = camera.fov
    targetFovRef.current = kp.fov ?? camera.fov
    targetPositionRef.current.set(kp.position.x, kp.position.y, kp.position.z)
    const targetVec = new THREE.Vector3(kp.target.x, kp.target.y, kp.target.z)
    lookAtMatrix.lookAt(targetPositionRef.current, targetVec, camera.up)
    targetQuaternionRef.current.setFromRotationMatrix(lookAtMatrix)
    elapsedRef.current = 0
  }

  useEffect(() => {
    if (!active || !keypoints || keypoints.length === 0) return
    indexRef.current = 0
    phaseRef.current = 'transition'
    initTarget(keypoints[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, keypoints])

  useFrame((state, delta) => {
    if (!active || !keypoints || keypoints.length === 0) return

    const frameCamera = state.camera
    const kp = keypoints[indexRef.current]
    const dt = Math.min(delta, 0.1)

    if (phaseRef.current === 'transition') {
      const duration = kp.transition ?? 2
      elapsedRef.current += dt
      const t = easeInOut(Math.min(elapsedRef.current / duration, 1))

      frameCamera.position.lerpVectors(startPositionRef.current, targetPositionRef.current, t)
      frameCamera.quaternion.slerpQuaternions(
        startQuaternionRef.current,
        targetQuaternionRef.current,
        t
      )
      if (frameCamera.fov !== targetFovRef.current) {
        frameCamera.fov = THREE.MathUtils.lerp(startFovRef.current, targetFovRef.current, t)
        frameCamera.updateProjectionMatrix()
      }

      if (t >= 1) {
        frameCamera.position.copy(targetPositionRef.current)
        frameCamera.quaternion.copy(targetQuaternionRef.current)
        frameCamera.fov = targetFovRef.current
        frameCamera.updateProjectionMatrix()
        elapsedRef.current = 0
        phaseRef.current = 'dwell'
      }
    } else {
      elapsedRef.current += dt
      if (elapsedRef.current >= (kp.dwell ?? 3)) {
        indexRef.current = (indexRef.current + 1) % keypoints.length
        phaseRef.current = 'transition'
        initTarget(keypoints[indexRef.current])
      }
    }
  })

  return null
}
