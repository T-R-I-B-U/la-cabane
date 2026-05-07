import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStableInteractionCallback } from '../interactions/useStableInteractionCallback'

const CENTER_NDC = new THREE.Vector2(0, 0)
const HOVER_EMISSIVE = new THREE.Color(0xffefbf)
const HOVER_EMISSIVE_INTENSITY = 0.35
const GREENHOUSE_DOOR_PARENT = 'door02'

function findGreenhouseDoorMeshes(cabane) {
  if (!cabane) return []
  const parent = cabane.getObjectByName(GREENHOUSE_DOOR_PARENT)
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

export function ClickableGreenhouseDoor({ cabane, active, onDoorClick }) {
  const { camera } = useThree()
  const hoveredRef = useRef(false)
  const materialStatesRef = useRef(new Map())
  const raycaster = useRef(new THREE.Raycaster())
  const onDoorClickRef = useStableInteractionCallback(onDoorClick)

  const doorMeshes = useMemo(() => {
    const found = findGreenhouseDoorMeshes(cabane)
    found.forEach((mesh) => {
      if (mesh.material) mesh.material = cloneMaterial(mesh.material)
    })
    return found
  }, [cabane])

  useEffect(() => {
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
  }, [doorMeshes])

  useEffect(() => {
    const onPointerDown = (event) => {
      if (event.button !== 0 || !hoveredRef.current) return
      onDoorClickRef.current?.()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [onDoorClickRef])

  useFrame(() => {
    if (!active || !doorMeshes.length) {
      doorMeshes.forEach((mesh) => {
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
    const hits = raycaster.current.intersectObjects(doorMeshes, true)
    const isHovered = hits.length > 0
    hoveredRef.current = isHovered

    doorMeshes.forEach((mesh) => {
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
