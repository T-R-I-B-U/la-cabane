import { useRef, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const TRIGGER_DIST = 4
const SLIDE_AMOUNT = 1.4
const LERP_SPEED   = 0.07

const DEBUG = import.meta.env.DEV

// Sphère de trigger au centre de la porte
function TriggerSphere({ position, open }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[TRIGGER_DIST, 16, 16]} />
      <meshBasicMaterial
        color={open ? '#22dd88' : '#e0443a'}
        transparent
        opacity={0.08}
        wireframe
      />
    </mesh>
  )
}

// Plan visible placeholder pour un panneau de porte
function DoorPanel({ objRef, color }) {
  const meshRef = useRef()

  useFrame(() => {
    const obj = objRef.current
    const mesh = meshRef.current
    if (!obj || !mesh) return
    obj.getWorldPosition(mesh.position)
    obj.getWorldQuaternion(mesh.quaternion)
  })

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1.2, 2.2, 0.08]} />
      <meshBasicMaterial color={color} transparent opacity={0.5} />
    </mesh>
  )
}

export function SlidingDoors({ cabane }) {
  const { camera } = useThree()
  const doors = useRef([])
  const [debugState, setDebugState] = useState([]) // pour les helpers React

  useEffect(() => {
    if (!cabane) return

    const pairs = new Map()

    cabane.traverse((obj) => {
      if (!obj.userData.cabaneNode) return
      if (obj.name !== 'door_right' && obj.name !== 'door_left') return
      const pid = obj.parent?.uuid
      if (!pid) return
      if (!pairs.has(pid)) pairs.set(pid, { right: null, left: null, parent: obj.parent })
      const pair = pairs.get(pid)
      if (obj.name === 'door_right') pair.right = obj
      else pair.left = obj
    })

    doors.current = []
    const dbg = []

    for (const { right, left, parent } of pairs.values()) {
      if (!right || !left) continue

      const center = new THREE.Vector3()
      parent.getWorldPosition(center)

      const entry = {
        right,
        left,
        center: center.clone(),
        rightOriginX: right.position.x,
        leftOriginX:  left.position.x,
        progress: 0,
        rightRef: { current: right },
        leftRef:  { current: left },
      }

      doors.current.push(entry)
      dbg.push(entry)

      if (DEBUG) {
        console.log(
          `[SlidingDoors] porte trouvée — parent: "${parent.name}"`,
          `| center: ${center.toArray().map(v => v.toFixed(2))}`,
          `| rightOriginX: ${right.position.x.toFixed(3)}`,
          `| leftOriginX: ${left.position.x.toFixed(3)}`,
        )
      }
    }

    if (DEBUG && dbg.length === 0) {
      console.warn('[SlidingDoors] Aucune paire door_right/door_left trouvée dans la cabane.')
    }

    setDebugState([...dbg])
  }, [cabane])

  useFrame(() => {
    for (const door of doors.current) {
      const dist = camera.position.distanceTo(door.center)
      const target = dist < TRIGGER_DIST ? 1 : 0
      door.progress += (target - door.progress) * LERP_SPEED

      door.right.position.x = door.rightOriginX + door.progress * SLIDE_AMOUNT
      door.left.position.x  = door.leftOriginX  - door.progress * SLIDE_AMOUNT

      const isOpen = door.progress > 0.5
      door.right.traverse((c) => { if (c.isMesh) c.userData.isDoorOpen = isOpen })
      door.left.traverse((c)  => { if (c.isMesh) c.userData.isDoorOpen = isOpen })
    }
  })

  if (!DEBUG) return null

  return (
    <>
      {debugState.map((door, i) => (
        <group key={i}>
          {/* Zone de trigger */}
          <TriggerSphere position={door.center} open={door.progress > 0.1} />
          {/* Panneaux placeholder */}
          <DoorPanel objRef={door.rightRef} color="#4488ff" />
          <DoorPanel objRef={door.leftRef}  color="#ff8844" />
        </group>
      ))}
    </>
  )
}
