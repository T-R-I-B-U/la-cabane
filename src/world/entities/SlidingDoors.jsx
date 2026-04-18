import { useRef, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const TRIGGER_DIST = 5
const SLIDE_AMOUNT = 1.5
const LERP_SPEED   = 0.07

const DEBUG = import.meta.env.DEV

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

function DoorPanel({ objRef, color }) {
  const meshRef = useRef()

  useFrame(() => {
    const obj  = objRef.current
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

/**
 * Trouve les meshes door_right / door_left à l'intérieur des GLBs chargés
 * (pas de filtre cabaneNode — les meshes internes n'ont pas ce flag).
 *
 * Hiérarchie réelle dans hut01.glb :
 *   hut01 → door01 → door01_1 → door_right (Mesh)
 *                              → door_left  (Mesh)
 *
 * En mode orbite : référence = OrbitControls.target (point regardé)
 * En mode joueur : référence = camera.position
 */
export function SlidingDoors({ cabane, playerMode, controlsRef }) {
  const { camera } = useThree()
  const doors      = useRef([])
  const [debugState, setDebugState] = useState([])

  useEffect(() => {
    if (!cabane) return

    const pairs = new Map() // parent.uuid → { right, left, parent }

    // Traverse sans filtre cabaneNode — les meshes internes GLB n'ont pas ce flag.
    cabane.traverse((obj) => {
      if (obj.name !== 'door_right' && obj.name !== 'door_left') return
      const pid = obj.parent?.uuid
      if (!pid) return
      if (!pairs.has(pid)) pairs.set(pid, { right: null, left: null, parent: obj.parent })
      const pair = pairs.get(pid)
      if (obj.name === 'door_right') pair.right = obj
      else                           pair.left  = obj
    })

    doors.current = []
    const dbg     = []

    for (const { right, left, parent } of pairs.values()) {
      if (!right || !left) continue

      // Centre de déclenchement = world pos du grand-parent (door01),
      // un niveau au-dessus de door01_1, pour être au milieu de l'ouverture.
      const triggerNode  = parent.parent ?? parent
      const center       = new THREE.Vector3()
      triggerNode.getWorldPosition(center)

      const entry = {
        right,
        left,
        center:       center.clone(),
        rightOriginX: right.position.x,
        leftOriginX:  left.position.x,
        progress:     0,
        rightRef:     { current: right },
        leftRef:      { current: left },
      }

      doors.current.push(entry)
      dbg.push(entry)

      if (DEBUG) {
        console.log(
          `[SlidingDoors] porte — parent: "${parent.name}" | triggerNode: "${triggerNode.name}"`,
          `| center: ${center.toArray().map(v => v.toFixed(2))}`,
          `| rightOriginX: ${right.position.x.toFixed(3)}`,
          `| leftOriginX:  ${left.position.x.toFixed(3)}`,
        )
      }
    }

    if (DEBUG && dbg.length === 0) {
      console.warn('[SlidingDoors] Aucune paire door_right/door_left trouvée.')
    }

    setDebugState([...dbg])
  }, [cabane])

  useFrame(() => {
    const viewerPos = playerMode
      ? camera.position
      : (controlsRef?.current?.target ?? camera.position)

    for (const door of doors.current) {
      const dist   = viewerPos.distanceTo(door.center)
      const target = dist < TRIGGER_DIST ? 1 : 0
      door.progress += (target - door.progress) * LERP_SPEED

      // door_right est retourné à 180° → on inverse le sens du glissement
      door.right.position.x = door.rightOriginX - door.progress * SLIDE_AMOUNT
      door.left.position.x  = door.leftOriginX  + door.progress * SLIDE_AMOUNT

      const isOpen = door.progress > 0.5
      if (door.right.isMesh) door.right.userData.isDoorOpen = isOpen
      if (door.left.isMesh)  door.left.userData.isDoorOpen  = isOpen
    }
  })

  if (!DEBUG) return null

  return (
    <>
      {debugState.map((door, i) => (
        <group key={i}>
          <TriggerSphere position={door.center} open={door.progress > 0.1} />
          <DoorPanel objRef={door.rightRef} color="#4488ff" />
          <DoorPanel objRef={door.leftRef}  color="#ff8844" />
        </group>
      ))}
    </>
  )
}
