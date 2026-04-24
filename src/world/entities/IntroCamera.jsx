import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

const HUT = new THREE.Vector3(-5.0111, 2.3616, 0.9556)

// delay      : secondes d'attente avant de commencer à bouger depuis ce waypoint
// waitForInput: stoppe la caméra ici jusqu'à ce que shouldAdvance passe à true
const WAYPOINTS = [
  {
    position: new THREE.Vector3(-81.2843, 28.5625, -16.8399),
    target:   HUT.clone(),
    duration: 0,
    delay:    5,
  },
  {
    position: new THREE.Vector3(-34.3023, 10.5207, -5.8784),
    target:   HUT.clone(),
    duration: 3.5,
  },
  {
    position: new THREE.Vector3(-20.864, 1.3988, -0.9681),
    target:   HUT.clone(),
    duration: 2.5,
    event:    'wait:door',
    waitForInput: true,
  },
  {
    position: new THREE.Vector3(-11.0133, 1.4437, -0.9188),
    target:   HUT.clone(),
    duration: 2.0,
    event:    'door:open',
  },
  {
    position: new THREE.Vector3(-11.0133, 1.4437, -0.9188),
    target:   HUT.clone(),
    duration: 0,
    event:    'inside',
  },
]

export default function IntroCamera({ active, shouldAdvance, onEvent }) {
  const { camera } = useThree()
  const stepRef     = useRef(-1)
  const progressRef = useRef(0)
  const delayRef    = useRef(0)
  const waitingRef  = useRef(false)
  const advancedRef = useRef(false)

  useEffect(() => {
    if (active) {
      stepRef.current     = -1
      progressRef.current = 0
      delayRef.current    = 0
      waitingRef.current  = false
      advancedRef.current = false
    }
  }, [active])

  // Quand shouldAdvance passe à true et qu'on attendait, on débloque.
  useEffect(() => {
    if (shouldAdvance && waitingRef.current && !advancedRef.current) {
      waitingRef.current  = false
      advancedRef.current = true
    }
  }, [shouldAdvance])

  useFrame((_, rawDelta) => {
    if (!active) return

    const delta = Math.min(rawDelta, 0.1)

    // Premier frame : snap au waypoint 0
    if (stepRef.current === -1) {
      camera.position.copy(WAYPOINTS[0].position)
      camera.lookAt(WAYPOINTS[0].target)
      stepRef.current = 0
      return
    }

    const step = stepRef.current
    if (step >= WAYPOINTS.length - 1) return

    // Pause pour l'input utilisateur
    if (waitingRef.current) return

    const from = WAYPOINTS[step]
    const to   = WAYPOINTS[step + 1]

    // Délai initial sur le waypoint courant
    if (from.delay && delayRef.current < from.delay) {
      delayRef.current += delta
      return
    }

    // Si durée nulle, saute directement
    if (to.duration === 0) {
      camera.position.copy(to.position)
      camera.lookAt(to.target)
      stepRef.current += 1
      progressRef.current = 0
      delayRef.current    = 0
      if (to.event) onEvent?.(to.event)
      return
    }

    progressRef.current = Math.min(progressRef.current + delta / to.duration, 1)
    const t = easeInOut(progressRef.current)

    camera.position.lerpVectors(from.position, to.position, t)
    const lookAt = new THREE.Vector3().lerpVectors(from.target, to.target, t)
    camera.lookAt(lookAt)

    if (progressRef.current >= 1) {
      stepRef.current    += 1
      progressRef.current = 0
      delayRef.current    = 0

      if (to.event) onEvent?.(to.event)

      if (to.waitForInput) {
        waitingRef.current = true
      }
    }
  })

  return null
}
