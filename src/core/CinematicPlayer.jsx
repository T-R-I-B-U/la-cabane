import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// Seconds to travel from one keypoint to the next (target moves at this pace).
const SEGMENT_DURATION = 8
// How tightly the camera follows the moving target — lower = lazier/dreamier.
const LERP_SPEED = 0.5

const _targetPos = new THREE.Vector3()
const _interpPos = new THREE.Vector3()
const _interpTarget = new THREE.Vector3()
const _lookAt = new THREE.Matrix4()
const _targetQuat = new THREE.Quaternion()

export function CinematicPlayer({ active, keypoints }) {
  const { camera: _camera } = useThree()
  const tRef = useRef(0) // continuous parameter: integer part = current segment

  useEffect(() => {
    if (!active || !keypoints?.length) return
    tRef.current = 0
  }, [active, keypoints])

  useFrame((state, delta) => {
    if (!active || !keypoints?.length || keypoints.length < 2) return

    const frameCamera = state.camera
    const n = keypoints.length

    // Advance t at steady pace, wrap around
    tRef.current = (tRef.current + delta / SEGMENT_DURATION) % n

    // Interpolate target position between adjacent keypoints
    const seg = Math.floor(tRef.current)
    const frac = tRef.current - seg
    const kpA = keypoints[seg]
    const kpB = keypoints[(seg + 1) % n]

    _interpPos.set(
      kpA.position.x + (kpB.position.x - kpA.position.x) * frac,
      kpA.position.y + (kpB.position.y - kpA.position.y) * frac,
      kpA.position.z + (kpB.position.z - kpA.position.z) * frac
    )
    _interpTarget.set(
      kpA.target.x + (kpB.target.x - kpA.target.x) * frac,
      kpA.target.y + (kpB.target.y - kpA.target.y) * frac,
      kpA.target.z + (kpB.target.z - kpA.target.z) * frac
    )
    const interpFov = kpA.fov + ((kpB.fov ?? kpA.fov) - kpA.fov) * frac

    // Build target quaternion from interpolated look direction
    _targetPos.copy(_interpPos)
    _lookAt.lookAt(_targetPos, _interpTarget, frameCamera.up)
    _targetQuat.setFromRotationMatrix(_lookAt)

    // Camera lazily follows the moving target
    const alpha = 1 - Math.exp(-LERP_SPEED * delta)
    frameCamera.position.lerp(_interpPos, alpha)
    frameCamera.quaternion.slerp(_targetQuat, alpha)

    if (frameCamera.fov !== interpFov) {
      frameCamera.fov = THREE.MathUtils.lerp(frameCamera.fov, interpFov, alpha)
      frameCamera.updateProjectionMatrix()
    }
  })

  return null
}
