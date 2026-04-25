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

export function ClickableDoor({ cabane, active, onDoorClick }) {
  const { camera, gl } = useThree()
  const hoveredRef    = useRef(false)
  const mouseRef      = useRef(new THREE.Vector2())
  const mouseMovedRef = useRef(false)
  const raycaster     = useRef(new THREE.Raycaster())

  // Clone materials so we don't mutate shared GLB materials.
  const doorMeshes = useMemo(() => {
    const found = findDoorMeshes(cabane)
    found.forEach((mesh) => {
      if (mesh.material) mesh.material = mesh.material.clone()
    })
    return found
  }, [cabane])

  useEffect(() => {
    console.log('[ClickableDoor] active:', active, '| meshes:', doorMeshes.length,
      doorMeshes.map(m => m.name))

    if (!active || !doorMeshes.length) return

    mouseMovedRef.current = false // reset on each activation

    const canvas = gl.domElement

    const onMouseMove = (e) => {
      mouseMovedRef.current = true
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1
      mouseRef.current.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1
    }

    const onClick = () => { if (hoveredRef.current) onDoorClick?.() }

    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('click', onClick)

    return () => {
      canvas.removeEventListener('mousemove', onMouseMove)
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
    if (!active || !doorMeshes.length || !mouseMovedRef.current) return

    raycaster.current.setFromCamera(mouseRef.current, camera)
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
