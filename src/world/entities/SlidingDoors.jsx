import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const TRIGGER_DIST = 4   // distance joueur → ouverture
const SLIDE_AMOUNT = 1.4  // unités de glissement par panneau
const LERP_SPEED   = 0.07

/**
 * Trouve toutes les paires (door_right / door_left) dans le groupe cabane,
 * les anime en fonction de la proximité du joueur,
 * et marque les meshes avec userData.isDoorOpen pour le système de collision.
 *
 * @param {{ cabane: THREE.Group | null }} props
 */
export function SlidingDoors({ cabane }) {
  const { camera } = useThree()
  // Chaque entrée : { right, left, center, rightOriginX, leftOriginX, progress }
  const doors = useRef([])

  useEffect(() => {
    if (!cabane) return

    const pairs = new Map() // parent.uuid → { right, left, parent }

    // Parcourt le graph pour trouver les noeuds cabane nommés door_right / door_left.
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

    for (const { right, left, parent } of pairs.values()) {
      if (!right || !left) continue

      // Centre world du groupe parent = point de déclenchement
      const center = new THREE.Vector3()
      parent.getWorldPosition(center)

      doors.current.push({
        right,
        left,
        center,
        rightOriginX: right.position.x,
        leftOriginX:  left.position.x,
        progress: 0,
      })
    }
  }, [cabane])

  useFrame(() => {
    for (const door of doors.current) {
      const dist = camera.position.distanceTo(door.center)
      const target = dist < TRIGGER_DIST ? 1 : 0
      door.progress += (target - door.progress) * LERP_SPEED

      // Glissement local en X : right → +X, left → -X
      door.right.position.x = door.rightOriginX + door.progress * SLIDE_AMOUNT
      door.left.position.x  = door.leftOriginX  - door.progress * SLIDE_AMOUNT

      // Marque les meshes pour le système de collision
      const isOpen = door.progress > 0.5
      door.right.traverse((c) => { if (c.isMesh) c.userData.isDoorOpen = isOpen })
      door.left.traverse((c)  => { if (c.isMesh) c.userData.isDoorOpen = isOpen })
    }
  })

  return null
}
