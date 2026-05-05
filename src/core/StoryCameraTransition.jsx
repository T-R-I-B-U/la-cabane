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
  const elapsedRef = useRef(0)
  const completeRef = useRef(false)

  const lookAtMatrix = useMemo(() => new THREE.Matrix4(), [])

  useEffect(() => {
    if (!transition) return

    startPositionRef.current.copy(camera.position)
    startQuaternionRef.current.copy(camera.quaternion)
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

  useFrame((_, delta) => {
    if (!transition || completeRef.current) return

    elapsedRef.current += Math.min(delta, 0.1)
    const duration = transition.duration ?? 1.2
    const t = easeInOut(Math.min(elapsedRef.current / duration, 1))

    camera.position.lerpVectors(startPositionRef.current, targetPositionRef.current, t)
    camera.quaternion.slerpQuaternions(startQuaternionRef.current, targetQuaternionRef.current, t)

    if (t < 1) return

    camera.position.copy(targetPositionRef.current)
    camera.quaternion.copy(targetQuaternionRef.current)
    completeRef.current = true
    onComplete?.()
  })

  return null
}
