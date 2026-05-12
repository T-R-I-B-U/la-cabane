import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { consumeTeleport, notifyLiveCamera } from './cameraRegistry'

const _dir = new THREE.Vector3()

// Mounted inside the Canvas — bridges the camera registry with Three.js.
// Reads live camera position (10 fps) and applies teleport requests every frame.
export function CameraRegistrySync({ controlsRef }) {
  const lastAt = useRef(0)

  useFrame((state) => {
    const { camera: frameCamera } = state
    const teleport = consumeTeleport()
    if (teleport) {
      frameCamera.position.set(teleport.position.x, teleport.position.y, teleport.position.z)
      if (teleport.fov && frameCamera.fov !== teleport.fov) {
        frameCamera.fov = teleport.fov
        frameCamera.updateProjectionMatrix()
      }
      // Orbit controls: update their target so the orbit pivot moves too.
      if (controlsRef?.current?.target) {
        controlsRef.current.target.set(teleport.target.x, teleport.target.y, teleport.target.z)
        controlsRef.current.update()
      } else {
        frameCamera.lookAt(teleport.target.x, teleport.target.y, teleport.target.z)
      }
    }

    const now = performance.now()
    if (now - lastAt.current < 100) return
    lastAt.current = now

    const pos = frameCamera.position
    // Use orbit target when available, otherwise estimate from camera direction.
    let tgt
    if (controlsRef?.current?.target) {
      tgt = controlsRef.current.target
    } else {
      frameCamera.getWorldDirection(_dir)
      tgt = _dir.clone().multiplyScalar(5).add(pos)
    }

    notifyLiveCamera({
      position: { x: +pos.x.toFixed(4), y: +pos.y.toFixed(4), z: +pos.z.toFixed(4) },
      target: { x: +tgt.x.toFixed(4), y: +tgt.y.toFixed(4), z: +tgt.z.toFixed(4) },
      fov: frameCamera.fov,
    })
  })

  return null
}
