import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStableInteractionCallback } from '../interactions/useStableInteractionCallback'

const CENTER_NDC = new THREE.Vector2(0, 0)
const HOVER_EMISSIVE = new THREE.Color(0xffefbf)
const HOVER_EMISSIVE_INTENSITY = 0.35
const WORKBENCH_NAME = 'workbench01'

function findWorkbenchMeshes(cabane) {
  if (!cabane) return []
  const parent = cabane.getObjectByName(WORKBENCH_NAME)
  if (!parent) return []
  const meshes = []
  parent.traverse((obj) => {
    if (obj.isMesh) meshes.push(obj)
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

export function ClickableWorkbench({ cabane, active, onInteract }) {
  const { camera } = useThree()
  const hoveredRef = useRef(false)
  const materialStatesRef = useRef(new Map())
  const raycaster = useRef(new THREE.Raycaster())
  const onInteractRef = useStableInteractionCallback(onInteract)

  const workbenchMeshes = useMemo(() => {
    const found = findWorkbenchMeshes(cabane)
    found.forEach((mesh) => {
      if (mesh.material) mesh.material = cloneMaterial(mesh.material)
    })
    return found
  }, [cabane])

  useEffect(() => {
    materialStatesRef.current = new Map()
    workbenchMeshes.forEach((mesh) => {
      forEachMaterial(mesh.material, (material) => {
        if (!material.emissive) return
        materialStatesRef.current.set(material, {
          emissive: material.emissive.clone(),
          emissiveIntensity: material.emissiveIntensity ?? 0,
        })
      })
    })
  }, [workbenchMeshes])

  useEffect(() => {
    const onPointerDown = (event) => {
      if (event.button !== 0 || !hoveredRef.current) return
      onInteractRef.current?.()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [onInteractRef])

  useFrame(() => {
    if (!active || !workbenchMeshes.length) {
      workbenchMeshes.forEach((mesh) => {
        forEachMaterial(mesh.material, (material) => {
          const original = materialStatesRef.current.get(material)
          if (!original || !material.emissive) return
          material.emissive.copy(original.emissive)
          material.emissiveIntensity = original.emissiveIntensity
        })
      })
      hoveredRef.current = false
      return
    }

    raycaster.current.setFromCamera(CENTER_NDC, camera)
    const hits = raycaster.current.intersectObjects(workbenchMeshes, true)
    const isHovered = hits.length > 0
    hoveredRef.current = isHovered

    workbenchMeshes.forEach((mesh) => {
      forEachMaterial(mesh.material, (material) => {
        const original = materialStatesRef.current.get(material)
        if (!original || !material.emissive) return
        if (!isHovered) {
          material.emissive.copy(original.emissive)
          material.emissiveIntensity = original.emissiveIntensity
          return
        }
        material.emissive.copy(HOVER_EMISSIVE)
        material.emissiveIntensity = HOVER_EMISSIVE_INTENSITY
      })
    })
  })

  return null
}
