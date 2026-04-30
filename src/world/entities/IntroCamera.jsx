import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { FLOOR_Y, PLAYER_HEIGHT } from '../../core/SceneConfig'

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

const WAYPOINTS = [
  {
    position: new THREE.Vector3(-106.4403, 35.0643, -22.7203),
    target: new THREE.Vector3(-25.2521, 10.0431, 0.3204),
    duration: 0,
    delay: 2,
  },
  {
    position: new THREE.Vector3(-65.9822, 16.7074, -13.0125),
    target: new THREE.Vector3(-27.2472, 2.4304, -1.2414),
    duration: 3.5,
  },
  {
    position: new THREE.Vector3(-47.788, 3.1494, -8.2744),
    target: new THREE.Vector3(-28.3895, 2.1819, -0.4626),
    duration: 2.5,
    event: 'wait:door',
    waitForInput: true,
  },
  {
    position: new THREE.Vector3(-41.0068, 1.3798, -5.4954),
    target: new THREE.Vector3(-27.8642, 0.744, -4.5197),
    duration: 2.0,
    event: 'door:open',
  },
  {
    position: new THREE.Vector3(-30.9486, FLOOR_Y + PLAYER_HEIGHT, -4.6344),
    target: new THREE.Vector3(-28.9187, FLOOR_Y + PLAYER_HEIGHT, -6.8089),
    duration: 2.5,
    event: 'inside',
  },
]

export default function IntroCamera({ active, shouldAdvance, onEvent }) {
  const { camera } = useThree()
  const stepRef = useRef(-1)
  const progressRef = useRef(0)
  const delayRef = useRef(0)
  const waitingRef = useRef(false)
  const advancedRef = useRef(false)

  useEffect(() => {
    if (active) {
      stepRef.current = -1
      progressRef.current = 0
      delayRef.current = 0
      waitingRef.current = false
      advancedRef.current = false
    }
  }, [active])

  useEffect(() => {
    if (shouldAdvance && waitingRef.current && !advancedRef.current) {
      waitingRef.current = false
      advancedRef.current = true
    }
  }, [shouldAdvance])

  useFrame((_, rawDelta) => {
    if (!active) return

    const delta = Math.min(rawDelta, 0.1)

    if (stepRef.current === -1) {
      camera.position.copy(WAYPOINTS[0].position)
      camera.lookAt(WAYPOINTS[0].target)
      stepRef.current = 0
      return
    }

    const step = stepRef.current
    if (step >= WAYPOINTS.length - 1) return

    if (waitingRef.current) return

    const from = WAYPOINTS[step]
    const to = WAYPOINTS[step + 1]

    if (from.delay && delayRef.current < from.delay) {
      delayRef.current += delta
      return
    }

    if (to.duration === 0) {
      camera.position.copy(to.position)
      camera.lookAt(to.target)
      stepRef.current += 1
      progressRef.current = 0
      delayRef.current = 0
      if (to.event)
        onEvent?.(to.event, { position: to.position.clone(), target: to.target.clone() })
      return
    }

    progressRef.current = Math.min(progressRef.current + delta / to.duration, 1)
    const t = easeInOut(progressRef.current)

    camera.position.lerpVectors(from.position, to.position, t)
    const lookAt = new THREE.Vector3().lerpVectors(from.target, to.target, t)
    camera.lookAt(lookAt)

    if (progressRef.current >= 1) {
      stepRef.current += 1
      progressRef.current = 0
      delayRef.current = 0

      if (to.event)
        onEvent?.(to.event, { position: to.position.clone(), target: to.target.clone() })

      if (to.waitForInput) {
        waitingRef.current = true
      }
    }
  })

  return null
}
