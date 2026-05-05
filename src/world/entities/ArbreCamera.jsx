import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getPlatformSpawn, PLATFORM_POS, PLAYER_HEIGHT } from '../../core/SceneConfig'

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

function buildWaypoints(platformPosition) {
  const spawn = getPlatformSpawn(platformPosition)
  const px = spawn.x
  const py = spawn.y // eye height on platform
  const pz = spawn.z

  // Fruit position: same as GrowingFruit, computed relative to platform base
  const fx = platformPosition[0]
  const fy = platformPosition[1] + PLAYER_HEIGHT + 3 // same offset as getPlatformSpawn
  const fz = platformPosition[2]

  return [
    // WP0: exact same camera as "Vue plateforme" button
    {
      position: new THREE.Vector3(px, py, pz),
      target: new THREE.Vector3(fx, fy + 2, fz - 2),
      duration: 0,
    },
    // WP1: élévation vers les feuilles au-dessus de la plateforme
    {
      position: new THREE.Vector3(px + 1, py + 3, pz - 2),
      target: new THREE.Vector3(fx, fy + 3, fz),
      duration: 2.5,
      event: 'reached:platform',
      waitForInput: true,
    },
    // WP2: immersion dans les feuilles
    {
      position: new THREE.Vector3(px + 2, py + 3.5, pz - 1),
      target: new THREE.Vector3(fx, fy + 2, fz),
      duration: 2.0,
      event: 'reached:leaves',
      waitForInput: true,
    },
    // WP3: focus sur le fruit du joueur
    {
      position: new THREE.Vector3(px + 3, py + 2, pz + 2),
      target: new THREE.Vector3(fx, fy, fz),
      duration: 2.0,
      event: 'reached:fruit',
      waitForInput: true,
    },
    // WP4: fin de séquence
    {
      position: new THREE.Vector3(px, py, pz),
      target: new THREE.Vector3(fx, fy + 2, fz - 2),
      duration: 1.5,
      event: 'done',
    },
  ]
}

export default function ArbreCamera({ active, shouldAdvance, platformPosition, onEvent }) {
  const { camera } = useThree()
  const stepRef = useRef(-1)
  const progressRef = useRef(0)
  const delayRef = useRef(0)
  const waitingRef = useRef(false)

  const waypoints = useMemo(
    () => buildWaypoints(platformPosition ?? PLATFORM_POS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [platformPosition?.[0], platformPosition?.[1], platformPosition?.[2]]
  )

  useLayoutEffect(() => {
    if (active) {
      stepRef.current = -1
      progressRef.current = 0
      delayRef.current = 0
      waitingRef.current = false

      camera.position.copy(waypoints[0].position)
      camera.lookAt(waypoints[0].target)
      stepRef.current = 0
    }
  }, [active, camera, waypoints])

  useEffect(() => {
    if (shouldAdvance && waitingRef.current) {
      waitingRef.current = false
    }
  }, [shouldAdvance])

  useFrame((_, rawDelta) => {
    if (!active) return

    const delta = Math.min(rawDelta, 0.1)
    const step = stepRef.current
    if (step < 0 || step >= waypoints.length - 1) return
    if (waitingRef.current) return

    const from = waypoints[step]
    const to = waypoints[step + 1]

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
      if (to.event) onEvent?.(to.event)
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

      if (to.event) onEvent?.(to.event)
      if (to.waitForInput) waitingRef.current = true
    }
  })

  return null
}
