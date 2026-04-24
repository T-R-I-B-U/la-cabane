import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Select } from '@react-three/postprocessing'
import * as THREE from 'three'

// Trouve les meshes door_right / door_left dans la hiérarchie du cabane.
function findDoorMeshes(cabane) {
  const meshes = []
  if (!cabane) return meshes
  cabane.traverse((obj) => {
    if (obj.isMesh && (obj.name === 'door_right' || obj.name === 'door_left')) {
      meshes.push(obj)
    }
  })
  return meshes
}

// Calcule le centre monde de la porte à partir des meshes.
function computeDoorCenter(meshes) {
  if (!meshes.length) return new THREE.Vector3(-5.0111, 3.2, 0.9556)
  const pos = new THREE.Vector3()
  meshes.forEach((m) => {
    const p = new THREE.Vector3()
    m.getWorldPosition(p)
    pos.add(p)
  })
  pos.divideScalar(meshes.length)
  return pos
}

export function ClickableDoor({ cabane, active, onDoorClick }) {
  const [hovered, setHovered] = useState(false)
  const meshesRef = useRef([])

  const doorMeshes = useMemo(() => {
    const found = findDoorMeshes(cabane)
    meshesRef.current = found
    return found
  }, [cabane])

  const doorCenter = useMemo(() => computeDoorCenter(doorMeshes), [doorMeshes])

  // Curseur pointer quand on survole
  useEffect(() => {
    if (!active) {
      document.body.style.cursor = 'default'
      return
    }
    document.body.style.cursor = hovered ? 'pointer' : 'default'
    return () => { document.body.style.cursor = 'default' }
  }, [hovered, active])

  // Emissive glow sur les meshes de la porte
  useFrame(() => {
    for (const mesh of meshesRef.current) {
      if (!mesh.material || !mesh.material.emissive) continue
      if (active && hovered) {
        mesh.material.emissive.set(0xffd580)
        mesh.material.emissiveIntensity = 0.6
      } else {
        mesh.material.emissive.set(0x000000)
        mesh.material.emissiveIntensity = 0
      }
    }
  })

  if (!active) return null

  // Zone de clic invisible positionnée devant la porte,
  // orientée pour faire face à la caméra d'approche.
  return (
    <Select enabled={hovered}>
      <mesh
        position={doorCenter}
        rotation={[0, -Math.PI / 2, 0]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation()
          onDoorClick?.()
        }}
      >
        <planeGeometry args={[3, 2.8]} />
        <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </Select>
  )
}
