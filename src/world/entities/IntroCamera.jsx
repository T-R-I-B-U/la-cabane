import { useEffect, useLayoutEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { FLOOR_Y, PLAYER_HEIGHT } from '../../core/SceneConfig'

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

const WAYPOINTS = [
  {
    position: new THREE.Vector3(-84.2679, 25.15, -24.166),
    target: new THREE.Vector3(-9.4607, 7.3604, -2.0887),
    duration: 0,
    delay: 2,
  },
  {
    position: new THREE.Vector3(-39.8198, 7.2813, -8.6382),
    target: new THREE.Vector3(-11.3697, 0.642, -1.0329),
    duration: 3.5,
  },
  {
    position: new THREE.Vector3(-31.6806, 3.5464, -6.5206),
    target: new THREE.Vector3(-11.8577, 0.6514, 0.0448),
    duration: 2.5,
    event: 'wait:door',
    waitForInput: true,
  },
  {
    position: new THREE.Vector3(-23.7944, 1.5695, -5.3764),
    target: new THREE.Vector3(-12.4469, 0.5678, -5.3619),
    duration: 2.0,
    event: 'door:open',
  },
  {
    position: new THREE.Vector3(-14.3667, 1.3785, -5.1169),
    target: new THREE.Vector3(-12.5066, 1.7137, -5.2008),
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
  const readyNotifiedRef = useRef(false)

  useLayoutEffect(() => {
    if (active) {
      stepRef.current = -1
      progressRef.current = 0
      delayRef.current = 0
      waitingRef.current = false
      advancedRef.current = false
      readyNotifiedRef.current = false

      // Place the intro camera before the first visible paint so the user
      // does not see the default orbit camera between the loader fade and intro start.
      camera.position.copy(WAYPOINTS[0].position)
      camera.lookAt(WAYPOINTS[0].target)
      stepRef.current = 0

      if (!readyNotifiedRef.current) {
        readyNotifiedRef.current = true
        onEvent?.('camera:ready')
      }
    }
  }, [active, camera, onEvent])

  useEffect(() => {
    if (shouldAdvance && waitingRef.current && !advancedRef.current) {
      waitingRef.current = false
      advancedRef.current = true
    }
  }, [shouldAdvance])

  useFrame((_, rawDelta) => {
    if (!active) return

    const delta = Math.min(rawDelta, 0.1)

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
