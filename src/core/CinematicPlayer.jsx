import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// Exponential decay — camera drifts lazily toward each keypoint.
// LERP_SPEED=1.0 → 63% of the way there after 1s, 95% after 3s.
// Lower = dreamier. Advance when ~85% there so the camera never fully stops.
const LERP_SPEED = 0.2
const ADVANCE_THRESHOLD = 0.15 // advance when progress > 1 - 0.15 = 85%

const _targetPos = new THREE.Vector3()
const _lookAt = new THREE.Matrix4()
const _targetQuat = new THREE.Quaternion()

export function CinematicPlayer({ active, keypoints }) {
  const { camera } = useThree()
  const indexRef = useRef(0)
  const progressRef = useRef(0)

  useEffect(() => {
    if (!active || !keypoints?.length) return
    indexRef.current = 0
    progressRef.current = 0
  }, [active, keypoints])

  useFrame((state, delta) => {
    if (!active || !keypoints?.length) return

    const frameCamera = state.camera
    const kp = keypoints[indexRef.current]

    _targetPos.set(kp.position.x, kp.position.y, kp.position.z)
    const targetVec = new THREE.Vector3(kp.target.x, kp.target.y, kp.target.z)
    _lookAt.lookAt(_targetPos, targetVec, camera.up)
    _targetQuat.setFromRotationMatrix(_lookAt)

    // Exponential lerp — frame-rate independent, always smooth
    const alpha = 1 - Math.exp(-LERP_SPEED * delta)

    frameCamera.position.lerp(_targetPos, alpha)
    frameCamera.quaternion.slerp(_targetQuat, alpha)

    if (kp.fov != null && frameCamera.fov !== kp.fov) {
      frameCamera.fov = THREE.MathUtils.lerp(frameCamera.fov, kp.fov, alpha)
      frameCamera.updateProjectionMatrix()
    }

    // Advance to next keypoint once close enough (based on position distance)
    progressRef.current += alpha * (1 - progressRef.current)
    if (progressRef.current > 1 - ADVANCE_THRESHOLD) {
      indexRef.current = (indexRef.current + 1) % keypoints.length
      progressRef.current = 0
    }
  })

  return null
}
