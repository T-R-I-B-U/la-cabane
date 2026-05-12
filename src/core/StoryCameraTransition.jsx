import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

export function StoryCameraTransition({ transition, onComplete }) {
  const { camera } = useThree()
  const startPositionRef = useRef(new THREE.Vector3())
  const startQuaternionRef = useRef(new THREE.Quaternion())
  const targetPositionRef = useRef(new THREE.Vector3())
  const targetQuaternionRef = useRef(new THREE.Quaternion())
  const startFovRef = useRef(60)
  const targetFovRef = useRef(60)
  const elapsedRef = useRef(0)
  const completeRef = useRef(false)

  const lookAtMatrix = useMemo(() => new THREE.Matrix4(), [])

  useEffect(() => {
    if (!transition) return

    startPositionRef.current.copy(camera.position)
    startQuaternionRef.current.copy(camera.quaternion)
    startFovRef.current = camera.fov
    targetFovRef.current = transition.fov ?? camera.fov
    targetPositionRef.current.set(
      transition.position.x,
      transition.position.y,
      transition.position.z
    )
    lookAtMatrix.lookAt(targetPositionRef.current, transition.target, camera.up)
    targetQuaternionRef.current.setFromRotationMatrix(lookAtMatrix)
    elapsedRef.current = 0
    completeRef.current = false
  }, [camera, lookAtMatrix, transition])

  useFrame((state, delta) => {
    if (!transition || completeRef.current) return

    const { camera: frameCamera } = state
    elapsedRef.current += Math.min(delta, 0.1)
    const duration = transition.duration ?? 1.2
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

    if (t < 1) return

    frameCamera.position.copy(targetPositionRef.current)
    frameCamera.quaternion.copy(targetQuaternionRef.current)
    frameCamera.fov = targetFovRef.current
    frameCamera.updateProjectionMatrix()
    completeRef.current = true
    onComplete?.()
  })

  return null
}
