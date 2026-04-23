import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const TRIGGER_DIST = 5
const SLIDE_AMOUNT = 1.5
const LERP_SPEED = 0.07

function getDoorProgress(progressRef, doorId) {
  return progressRef.current.get(doorId) ?? 0
}

function TriggerSphere({ position, progressRef, doorId }) {
  const materialRef = useRef()

  useFrame(() => {
    const material = materialRef.current
    if (!material) return

    const isOpen = getDoorProgress(progressRef, doorId) > 0.1
    material.color.set(isOpen ? '#22dd88' : '#e0443a')
  })

  return (
    <mesh position={position} raycast={() => {}}>
      <sphereGeometry args={[TRIGGER_DIST, 16, 16]} />
      <meshBasicMaterial ref={materialRef} color="#e0443a" transparent opacity={0.08} wireframe />
    </mesh>
  )
}

function DoorPanel({ cabane, objectId, color }) {
  const meshRef = useRef()

  useFrame(() => {
    const obj = cabane?.getObjectByProperty('uuid', objectId)
    const mesh = meshRef.current
    if (!obj || !mesh) return
    obj.getWorldPosition(mesh.position)
    obj.getWorldQuaternion(mesh.quaternion)
  })

  return (
    <mesh ref={meshRef} raycast={() => {}}>
      <boxGeometry args={[1.2, 2.2, 0.08]} />
      <meshBasicMaterial color={color} transparent opacity={0.5} />
    </mesh>
  )
}

function collectDoors(cabane, debug) {
  if (!cabane) return []

  const pairs = new Map()

  cabane.traverse((obj) => {
    if (!obj.name.startsWith('door_right') && !obj.name.startsWith('door_left')) return

    const parentId = obj.parent?.uuid
    if (!parentId) return

    if (!pairs.has(parentId)) {
      pairs.set(parentId, { right: null, left: null, parent: obj.parent })
    }

    const pair = pairs.get(parentId)
    if (obj.name.startsWith('door_right')) pair.right = obj
    else pair.left = obj
  })

  const entries = []

  for (const { right, left, parent } of pairs.values()) {
    if (!right || !left) continue

    let node = parent
    let isDoorModel = false

    while (node) {
      if (/^door/i.test(node.name)) {
        isDoorModel = true
        break
      }

      node = node.parent
    }

    if (!isDoorModel) continue

    const center = new THREE.Vector3()
    right.getWorldPosition(center)

    const entry = {
      id: `${right.uuid}:${left.uuid}`,
      rightId: right.uuid,
      leftId: left.uuid,
      center: center.clone(),
      rightOriginZ: right.position.z,
      leftOriginZ: left.position.z,
    }

    entries.push(entry)

    if (debug) {
      console.log(
        `[SlidingDoors] porte — parent: "${parent.name}"`,
        `| center: ${center.toArray().map((v) => v.toFixed(2))}`,
        `| rightOriginZ: ${right.position.z.toFixed(3)}`,
        `| leftOriginZ:  ${left.position.z.toFixed(3)}`
      )
    }
  }

  if (debug && entries.length === 0) {
    console.warn('[SlidingDoors] Aucune paire door_right/door_left trouvée.')
  }

  return entries
}

/**
 * Trouve les meshes door_right / door_left à l'intérieur des GLBs chargés
 * (pas de filtre cabaneNode — les meshes internes GLB n'ont pas ce flag).
 *
 * Hiérarchie réelle dans hut01.glb :
 *   hut01 → door01 → door01_1 → door_right (Mesh)
 *                              → door_left  (Mesh)
 *
 * En mode orbite : référence = OrbitControls.target (point regardé)
 * En mode joueur : référence = camera.position
 */
export function SlidingDoors({ cabane, playerMode, controlsRef, debug = false }) {
  const { camera } = useThree()
  const progressRef = useRef(new Map())
  const doors = useMemo(() => collectDoors(cabane, debug), [cabane, debug])

  useEffect(() => {
    progressRef.current = new Map()
  }, [doors])

  useFrame(() => {
    const viewerPos = playerMode
      ? camera.position
      : (controlsRef?.current?.target ?? camera.position)

    for (const door of doors) {
      const right = cabane?.getObjectByProperty('uuid', door.rightId)
      const left = cabane?.getObjectByProperty('uuid', door.leftId)
      if (!right || !left) continue

      const dist = viewerPos.distanceTo(door.center)
      const target = dist < TRIGGER_DIST ? 1 : 0
      const progress = getDoorProgress(progressRef, door.id)
      const nextProgress = progress + (target - progress) * LERP_SPEED

      progressRef.current.set(door.id, nextProgress)

      right.position.z = door.rightOriginZ + nextProgress * SLIDE_AMOUNT
      left.position.z = door.leftOriginZ - nextProgress * SLIDE_AMOUNT

      const isOpen = nextProgress > 0.5
      if (right.isMesh) right.userData.isDoorOpen = isOpen
      if (left.isMesh) left.userData.isDoorOpen = isOpen
    }
  })

  if (!debug) return null

  return (
    <>
      {doors.map((door) => (
        <group key={door.id}>
          <TriggerSphere position={door.center} progressRef={progressRef} doorId={door.id} />
          <DoorPanel cabane={cabane} objectId={door.rightId} color="#4488ff" />
          <DoorPanel cabane={cabane} objectId={door.leftId} color="#ff8844" />
        </group>
      ))}
    </>
  )
}
