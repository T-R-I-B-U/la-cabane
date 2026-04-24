import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

function findDoorMeshes(cabane) {
  const meshes = []
  if (!cabane) return meshes
  cabane.traverse((obj) => {
    if (obj.isMesh && (obj.name.startsWith('door_right') || obj.name.startsWith('door_left'))) {
      meshes.push(obj)
    }
  })
  return meshes
}

const CENTER = new THREE.Vector2(0, 0)

export function ClickableDoor({ cabane, active, onDoorClick }) {
  const { camera, gl } = useThree()
  const hoveredRef = useRef(false)
  const raycaster  = useRef(new THREE.Raycaster())

  // Clone materials so we don't mutate shared GLB materials.
  const doorMeshes = useMemo(() => {
    const found = findDoorMeshes(cabane)
    found.forEach((mesh) => {
      if (mesh.material) mesh.material = mesh.material.clone()
    })
    return found
  }, [cabane])

  useEffect(() => {
    console.log('[ClickableDoor] active:', active, '| meshes trouvés:', doorMeshes.length,
      doorMeshes.map(m => `${m.name} (mat: ${m.material?.type ?? 'none'})`))

    if (!active || !doorMeshes.length) return

    const canvas = gl.domElement
    const onClick = () => { if (hoveredRef.current) onDoorClick?.() }
    canvas.addEventListener('click', onClick)

    return () => {
      canvas.removeEventListener('click', onClick)
      document.body.style.cursor = 'default'
      doorMeshes.forEach((mesh) => {
        if (mesh.material?.emissive) {
          mesh.material.emissive.set(0x000000)
          mesh.material.emissiveIntensity = 0
        }
      })
    }
  }, [active, gl, doorMeshes, onDoorClick])

  useFrame(() => {
    if (!active || !doorMeshes.length) return

    // FreeLook rotates the camera to follow the mouse — center screen = what you're aiming at.
    raycaster.current.setFromCamera(CENTER, camera)
    const hits = raycaster.current.intersectObjects(doorMeshes, true)
    const isHovered = hits.length > 0

    if (isHovered !== hoveredRef.current) {
      console.log('[ClickableDoor] hover:', isHovered, hits[0]?.object?.name)
    }
    hoveredRef.current = isHovered

    doorMeshes.forEach((mesh) => {
      if (!mesh.material?.emissive) return
      mesh.material.emissive.set(isHovered ? 0xffd580 : 0x000000)
      mesh.material.emissiveIntensity = isHovered ? 0.6 : 0
    })

    document.body.style.cursor = isHovered ? 'pointer' : 'default'
  })

  return null
}
