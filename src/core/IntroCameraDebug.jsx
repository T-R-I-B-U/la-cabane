import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

// Lit position + target OrbitControls à 10 fps et remonte via onChange.
export function CameraTracker({ controlsRef, onChange }) {
  const lastAt = useRef(0)

  useFrame(({ camera }) => {
    const now = performance.now()
    if (now - lastAt.current < 100) return
    lastAt.current = now

    const pos = camera.position
    const tgt = controlsRef?.current?.target

    onChange({
      position: { x: +pos.x.toFixed(4), y: +pos.y.toFixed(4), z: +pos.z.toFixed(4) },
      target: tgt
        ? { x: +tgt.x.toFixed(4), y: +tgt.y.toFixed(4), z: +tgt.z.toFixed(4) }
        : { x: +pos.x.toFixed(4), y: +pos.y.toFixed(4), z: +pos.z.toFixed(4) },
    })
  })

  return null
}
