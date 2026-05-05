import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStableInteractionCallback } from '../interactions/useStableInteractionCallback'

const HOVER_EMISSIVE = new THREE.Color(0xfff1c2)
const HOVER_EMISSIVE_INTENSITY = 0.45
const OUTLINE_COLOR = 0xffffff
const OUTLINE_OPACITY = 0.9
const INTRO_DOOR_PARENT = 'door01'

function findIntroDoorMeshes(cabane) {
  if (!cabane) return []

  const parent = cabane.getObjectByName(INTRO_DOOR_PARENT)
  if (!parent) return []

  const meshes = []
  parent.traverse((obj) => {
    if (!obj.isMesh) return
    if (!obj.name.startsWith('door_right') && !obj.name.startsWith('door_left')) return
    meshes.push(obj)
  })

  return meshes
}

function forEachMaterial(material, callback) {
  if (Array.isArray(material)) material.forEach(callback)
  else if (material) callback(material)
}

function cloneMaterial(material) {
  return Array.isArray(material) ? material.map((entry) => entry.clone()) : material.clone()
}

function createDoorOutline(mesh) {
  const geometry = new THREE.EdgesGeometry(mesh.geometry, 20)
  const material = new THREE.LineBasicMaterial({
    color: OUTLINE_COLOR,
    transparent: true,
    opacity: OUTLINE_OPACITY,
    depthTest: false,
  })
  const outline = new THREE.LineSegments(geometry, material)
  outline.name = `${mesh.name}-hover-outline`
  outline.visible = false
  outline.renderOrder = 10
  outline.raycast = () => {}
  return outline
}

export function ClickableDoor({ cabane, active, onDoorClick }) {
  const { camera, gl } = useThree()
  const hoveredRef = useRef(false)
  const mouseRef = useRef(new THREE.Vector2())
  const mouseMovedRef = useRef(false)
  const prevActiveRef = useRef(false)
  const onDoorClickRef = useStableInteractionCallback(onDoorClick)
  const outlinesRef = useRef([])
  const materialStatesRef = useRef(new Map())
  const raycaster = useRef(new THREE.Raycaster())

  // Clone materials so we don't mutate shared GLB materials.
  const doorMeshes = useMemo(() => {
    const found = findIntroDoorMeshes(cabane)
    found.forEach((mesh) => {
      if (mesh.material) mesh.material = cloneMaterial(mesh.material)
    })
    return found
  }, [cabane])

  useEffect(() => {
    const outlines = doorMeshes.map((mesh) => {
      const outline = createDoorOutline(mesh)
      mesh.add(outline)
      return outline
    })

    outlinesRef.current = outlines
    materialStatesRef.current = new Map()

    doorMeshes.forEach((mesh) => {
      forEachMaterial(mesh.material, (material) => {
        if (!material.emissive) return
        materialStatesRef.current.set(material, {
          emissive: material.emissive.clone(),
          emissiveIntensity: material.emissiveIntensity ?? 0,
        })
      })
    })

    return () => {
      outlines.forEach((outline) => {
        outline.removeFromParent()
        outline.geometry.dispose()
        outline.material.dispose()
      })
      outlinesRef.current = []
    }
  }, [doorMeshes])

  const setDoorHover = useCallback(
    (isHovered) => {
      outlinesRef.current.forEach((outline) => {
        outline.visible = isHovered
      })

      doorMeshes.forEach((mesh) => {
        forEachMaterial(mesh.material, (material) => {
          const original = materialStatesRef.current.get(material)
          if (!original || !material.emissive) return

          if (isHovered) {
            material.emissive.copy(HOVER_EMISSIVE)
            material.emissiveIntensity = HOVER_EMISSIVE_INTENSITY
          } else {
            material.emissive.copy(original.emissive)
            material.emissiveIntensity = original.emissiveIntensity
          }
        })
      })
    },
    [doorMeshes]
  )

  useEffect(() => {
    // Reset the "mouse has moved" flag only when active transitions false → true.
    if (active && !prevActiveRef.current) mouseMovedRef.current = false
    prevActiveRef.current = active

    if (!active || !doorMeshes.length) return

    const canvas = gl.domElement

    const onMouseMove = (e) => {
      mouseMovedRef.current = true
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    }

    const onClick = () => {
      if (hoveredRef.current) onDoorClickRef.current?.()
    }

    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('click', onClick)

    return () => {
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('click', onClick)
      hoveredRef.current = false
      mouseMovedRef.current = false
      setDoorHover(false)
    }
  }, [active, gl, doorMeshes, onDoorClickRef, setDoorHover])

  useFrame(() => {
    if (!active || !doorMeshes.length || !mouseMovedRef.current) return

    raycaster.current.setFromCamera(mouseRef.current, camera)
    const hits = raycaster.current.intersectObjects(doorMeshes, true)
    const isHovered = hits.length > 0

    if (hoveredRef.current !== isHovered) {
      hoveredRef.current = isHovered
      setDoorHover(isHovered)
    }
  })

  return null
}
