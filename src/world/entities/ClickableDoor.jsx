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
  const hoveredRef      = useRef(false)
  const mouseRef        = useRef(new THREE.Vector2())
  const mouseMovedRef   = useRef(false)
  const prevActiveRef   = useRef(false)
  const onDoorClickRef  = useRef(onDoorClick)
  const raycaster       = useRef(new THREE.Raycaster())

  // Keep the callback ref current without re-running the event-listener effect.
  useEffect(() => { onDoorClickRef.current = onDoorClick }, [onDoorClick])

  // Clone materials so we don't mutate shared GLB materials.
  const doorMeshes = useMemo(() => {
    const found = findDoorMeshes(cabane)
    found.forEach((mesh) => {
      if (mesh.material) mesh.material = mesh.material.clone()
    })
    return found
  }, [cabane])

  useEffect(() => {
    // Reset the "mouse has moved" flag only when active transitions false → true.
    if (active && !prevActiveRef.current) mouseMovedRef.current = false
    prevActiveRef.current = active

    if (!active || !doorMeshes.length) return

    const canvas = gl.domElement

    const onMouseMove = (e) => {
      mouseMovedRef.current = true
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1
      mouseRef.current.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1
    }

    const onClick = () => { if (hoveredRef.current) onDoorClickRef.current?.() }

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
  }, [active, gl, doorMeshes])

  useFrame(() => {
    if (!active || !doorMeshes.length || !mouseMovedRef.current) return

    raycaster.current.setFromCamera(mouseRef.current, camera)
    const hits = raycaster.current.intersectObjects(doorMeshes, true)
    const isHovered = hits.length > 0

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
