import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Invisible sphere trigger. Calls onEnter when camera enters, onLeave when it exits.
 * Uses squared distance — no sqrt overhead per frame.
 */
export function TriggerZone({ center, radius, onEnter, onLeave }) {
  const { camera } = useThree()
  const inside = useRef(false)
  const centerVec = useRef(new THREE.Vector3(...center))
  const r2 = radius * radius

  useEffect(() => {
    centerVec.current.set(...center)
    inside.current = false
  }, [center])

  useFrame(() => {
    const dist2 = camera.position.distanceToSquared(centerVec.current)
    if (!inside.current && dist2 < r2) {
      inside.current = true
      onEnter?.()
    } else if (inside.current && dist2 >= r2) {
      inside.current = false
      onLeave?.()
    }
  })

  return null
}
