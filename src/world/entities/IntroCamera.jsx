import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

const HUT = new THREE.Vector3(-5.0111, 2.3616, 0.9556)

// Waypoints de la cinématique d'intro.
// Toutes les valeurs de position/target sont en world space et à ajuster
// une fois la scène chargée visuellement.
// event : identifiant émis via onEvent() à l'arrivée sur ce waypoint.
const WAYPOINTS = [
  {
    position: new THREE.Vector3(HUT.x + 22, HUT.y + 14, HUT.z + 28),
    target: HUT.clone(),
    duration: 0,
  },
  {
    // Approche de la porte depuis l'extérieur
    position: new THREE.Vector3(HUT.x, 4, HUT.z + 8),
    target: new THREE.Vector3(HUT.x, 3, HUT.z),
    duration: 3.5,
  },
  {
    // Devant la porte — déclenche l'ouverture
    position: new THREE.Vector3(HUT.x, 3.5, HUT.z + 3),
    target: new THREE.Vector3(HUT.x, 3, HUT.z - 1),
    duration: 2.0,
    event: 'door:open',
  },
  {
    // Entrée dans la cabane
    position: new THREE.Vector3(HUT.x, 3.5, HUT.z - 0.5),
    target: new THREE.Vector3(HUT.x, 3, HUT.z - 4),
    duration: 2.5,
    event: 'inside',
  },
]

export default function IntroCamera({ active, onEvent }) {
  const { camera } = useThree()
  const stepRef = useRef(-1)
  const progressRef = useRef(0)

  useEffect(() => {
    if (active) {
      stepRef.current = -1
      progressRef.current = 0
    }
  }, [active])

  useFrame((_, rawDelta) => {
    if (!active) return

    const delta = Math.min(rawDelta, 0.1)

    // Premier frame : snappe la caméra au waypoint 0
    if (stepRef.current === -1) {
      camera.position.copy(WAYPOINTS[0].position)
      camera.lookAt(WAYPOINTS[0].target)
      stepRef.current = 0
      return
    }

    const step = stepRef.current
    if (step >= WAYPOINTS.length - 1) return

    const from = WAYPOINTS[step]
    const to = WAYPOINTS[step + 1]

    progressRef.current = Math.min(progressRef.current + delta / to.duration, 1)
    const t = easeInOut(progressRef.current)

    camera.position.lerpVectors(from.position, to.position, t)

    const lookTarget = new THREE.Vector3().lerpVectors(from.target, to.target, t)
    camera.lookAt(lookTarget)

    if (progressRef.current >= 1) {
      stepRef.current += 1
      progressRef.current = 0
      if (to.event) onEvent?.(to.event)
    }
  })

  return null
}
