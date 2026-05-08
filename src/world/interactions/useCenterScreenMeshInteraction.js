import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStableInteractionCallback } from './useStableInteractionCallback'

const CENTER_NDC = new THREE.Vector2(0, 0)

export function forEachMeshMaterial(material, callback) {
  if (Array.isArray(material)) material.forEach(callback)
  else if (material) callback(material)
}

export function cloneMeshMaterialShallow(material) {
  if (!material) return material
  return Array.isArray(material) ? material.map((entry) => entry.clone()) : material.clone()
}

export function useCenterScreenMeshInteraction({
  cabaneGroup,
  isInteractable,
  findMeshes,
  hoverEmissive,
  hoverEmissiveIntensity,
  onInteract,
}) {
  const { camera } = useThree()
  const hoveredRef = useRef(false)
  const materialStatesRef = useRef(new Map())
  const clonedMaterialsRef = useRef(new Map())
  const raycasterRef = useRef(new THREE.Raycaster())
  const onInteractRef = useStableInteractionCallback(onInteract)

  const interactionMeshes = useMemo(() => {
    return findMeshes(cabaneGroup)
  }, [cabaneGroup, findMeshes])

  useEffect(() => {
    materialStatesRef.current = new Map()
    clonedMaterialsRef.current = new Map()

    interactionMeshes.forEach((mesh) => {
      const originalMaterial = mesh.material
      if (originalMaterial) {
        const clonedMaterial = cloneMeshMaterialShallow(originalMaterial)
        mesh.material = clonedMaterial
        clonedMaterialsRef.current.set(mesh, { originalMaterial, clonedMaterial })
      }

      forEachMeshMaterial(mesh.material, (material) => {
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
        forEachMeshMaterial(clonedMaterial, (material) => material.dispose())
      })
      clonedMaterialsRef.current = new Map()
      materialStatesRef.current = new Map()
      hoveredRef.current = false
    }
  }, [interactionMeshes])

  useEffect(() => {
    const onPointerDown = (event) => {
      if (event.button !== 0 || !hoveredRef.current) return
      onInteractRef.current?.()
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [onInteractRef])

  useFrame(() => {
    if (!isInteractable || !interactionMeshes.length) {
      interactionMeshes.forEach((mesh) => {
        forEachMeshMaterial(mesh.material, (material) => {
          const original = materialStatesRef.current.get(material)
          if (!original || !material.emissive) return
          material.emissive.copy(original.emissive)
          material.emissiveIntensity = original.emissiveIntensity
        })
      })
      hoveredRef.current = false
      return
    }

    raycasterRef.current.setFromCamera(CENTER_NDC, camera)
    const isHovered = raycasterRef.current.intersectObjects(interactionMeshes, true).length > 0
    hoveredRef.current = isHovered

    interactionMeshes.forEach((mesh) => {
      forEachMeshMaterial(mesh.material, (material) => {
        const original = materialStatesRef.current.get(material)
        if (!original || !material.emissive) return

        if (!isHovered) {
          material.emissive.copy(original.emissive)
          material.emissiveIntensity = original.emissiveIntensity
          return
        }

        material.emissive.copy(hoverEmissive)
        material.emissiveIntensity = hoverEmissiveIntensity
      })
    })
  })
}
