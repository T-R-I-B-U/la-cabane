import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStableInteractionCallback } from '../interactions/useStableInteractionCallback'
import { cursorStore } from '../../utils/cursorStore'

const HOVER_EMISSIVE = new THREE.Color(0xfff1c2)
const HOVER_EMISSIVE_INTENSITY = 0.45
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

export function ClickableDoor({ cabane, active, onDoorClick }) {
  const { camera, gl } = useThree()
  const hoveredRef = useRef(false)
  const mouseRef = useRef(new THREE.Vector2())
  const mouseMovedRef = useRef(false)
  const prevActiveRef = useRef(false)
  const onDoorClickRef = useStableInteractionCallback(onDoorClick)
  const materialStatesRef = useRef(new Map())
  const clonedMaterialsRef = useRef(new Map())
  const raycaster = useRef(new THREE.Raycaster())

  const doorMeshes = useMemo(() => findIntroDoorMeshes(cabane), [cabane])

  useEffect(() => {
    clonedMaterialsRef.current = new Map()
    doorMeshes.forEach((mesh) => {
      if (!mesh.material) return
      const originalMaterial = mesh.material
      const clonedMaterial = cloneMaterial(originalMaterial)
      mesh.material = clonedMaterial
      clonedMaterialsRef.current.set(mesh, { originalMaterial, clonedMaterial })
    })

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
      clonedMaterialsRef.current.forEach(({ originalMaterial, clonedMaterial }, mesh) => {
        mesh.material = originalMaterial
        forEachMaterial(clonedMaterial, (material) => material.dispose())
      })
      clonedMaterialsRef.current = new Map()
      materialStatesRef.current = new Map()
    }
  }, [doorMeshes])

  const setDoorHover = useCallback(
    (isHovered) => {
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
      const cx = document.pointerLockElement ? cursorStore.x : e.clientX
      const cy = document.pointerLockElement ? cursorStore.y : e.clientY
      mouseRef.current.x = ((cx - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((cy - rect.top) / rect.height) * 2 + 1
    }

    const onClick = () => {
      if (!hoveredRef.current) return
      // Only request pointer lock if not already locked — re-requesting when already
      // locked can cause a brief release/relock cycle that desyncs PointerLockControls.
      if (!document.pointerLockElement) canvas.requestPointerLock()
      onDoorClickRef.current?.()
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
    if (!active || !doorMeshes.length) return

    // Without pointer lock the cursor is physical — auto-highlight the door so it
    // is always interactive regardless of where the mouse happens to be positioned.
    // With pointer lock the virtual cursor (cursorStore) is used, so raycasting is needed.
    if (!document.pointerLockElement) {
      if (!hoveredRef.current) {
        hoveredRef.current = true
        setDoorHover(true)
      }
      return
    }

    if (!mouseMovedRef.current) return

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
