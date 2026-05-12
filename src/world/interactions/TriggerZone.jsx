import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Invisible sphere trigger. Calls onEnter when camera enters, onLeave when it exits.
 * Uses squared distance — no sqrt overhead per frame.
 * leaveRadius > radius creates a hysteresis band that prevents rapid toggling at the boundary.
 */
export function TriggerZone({ center, radius, leaveRadius, onEnter, onLeave }) {
  const { camera } = useThree()
  const inside = useRef(false)
  const centerVec = useRef(new THREE.Vector3(...center))
  const enterR2 = radius * radius
  const exitR2 = (leaveRadius ?? radius) * (leaveRadius ?? radius)

  useEffect(() => {
    centerVec.current.set(...center)
    inside.current = false
  }, [center])

  useFrame(() => {
    const dist2 = camera.position.distanceToSquared(centerVec.current)
    if (!inside.current && dist2 < enterR2) {
      inside.current = true
      onEnter?.()
    } else if (inside.current && dist2 >= exitR2) {
      inside.current = false
      onLeave?.()
    }
  })

  return null
}
