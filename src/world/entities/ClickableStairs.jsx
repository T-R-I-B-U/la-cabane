import { useRef, useMemo, useEffect, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStableInteractionCallback } from '../interactions/useStableInteractionCallback'

const CENTER_NDC = new THREE.Vector2(0, 0)
const HOVER_EMISSIVE = new THREE.Color(0xfff1c2)
const HOVER_EMISSIVE_INTENSITY = 0.45
const noop = () => {}

function forEachMaterial(material, callback) {
  if (Array.isArray(material)) material.forEach(callback)
  else if (material) callback(material)
}

function cloneMaterial(material) {
  return Array.isArray(material) ? material.map((m) => m.clone()) : material.clone()
}

function getStairsData(cabaneGroup) {
  if (!cabaneGroup) return null
  const stairsObject = cabaneGroup.getObjectByName('stairs01')
  if (!stairsObject) return null

  stairsObject.updateWorldMatrix(true, true)
  const box = new THREE.Box3().setFromObject(stairsObject)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())

  const meshes = []
  stairsObject.traverse((obj) => {
    if (obj.isMesh) meshes.push(obj)
  })

  return { center, size, meshes }
}

export function ClickableStairs({ cabane, isInteractable, onInteract, onHover }) {
  const { camera } = useThree()
  const hitboxRef = useRef()
  const hoveredRef = useRef(false)
  const raycasterRef = useRef(new THREE.Raycaster())
  const onInteractRef = useStableInteractionCallback(onInteract)
  const onHoverRef = useStableInteractionCallback(onHover)
  const materialStatesRef = useRef(new Map())
  const clonedMaterialsRef = useRef(new Map())

  const data = useMemo(() => getStairsData(cabane), [cabane])

  useEffect(() => {
    if (!data?.meshes.length) return

    clonedMaterialsRef.current = new Map()
    data.meshes.forEach((mesh) => {
      if (!mesh.material) return
      const originalMaterial = mesh.material
      const cloned = cloneMaterial(originalMaterial)
      mesh.material = cloned
      clonedMaterialsRef.current.set(mesh, { originalMaterial, cloned })
    })

    data.meshes.forEach((mesh) => {
      forEachMaterial(mesh.material, (mat) => {
        if (!mat.emissive) return
        materialStatesRef.current.set(mat, {
          emissive: mat.emissive.clone(),
          emissiveIntensity: mat.emissiveIntensity ?? 0,
        })
      })
    })

    return () => {
      clonedMaterialsRef.current.forEach(({ originalMaterial, cloned }, mesh) => {
        mesh.material = originalMaterial
        forEachMaterial(cloned, (m) => m.dispose())
      })
      clonedMaterialsRef.current = new Map()
      materialStatesRef.current = new Map()
    }
  }, [data])

  const setStairsHover = useCallback(
    (isHovered) => {
      if (data?.meshes) {
        data.meshes.forEach((mesh) => {
          forEachMaterial(mesh.material, (mat) => {
            const original = materialStatesRef.current.get(mat)
            if (!original || !mat.emissive) return
            if (isHovered) {
              mat.emissive.copy(HOVER_EMISSIVE)
              mat.emissiveIntensity = HOVER_EMISSIVE_INTENSITY
            } else {
              mat.emissive.copy(original.emissive)
              mat.emissiveIntensity = original.emissiveIntensity
            }
          })
        })
      }
    },
    [data]
  )

  useEffect(() => {
    const onPointerDown = (e) => {
      if (e.button !== 0 || !hoveredRef.current) return
      onInteractRef.current?.()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [onInteractRef])

  useFrame(() => {
    const mesh = hitboxRef.current
    if (!mesh) return

    if (!isInteractable) {
      if (mesh.raycast !== noop) mesh.raycast = noop
      if (hoveredRef.current) {
        hoveredRef.current = false
        setStairsHover(false)
        onHoverRef.current?.(false)
      }
      return
    }

    if (mesh.raycast === noop) mesh.raycast = THREE.Mesh.prototype.raycast.bind(mesh)

    raycasterRef.current.setFromCamera(CENTER_NDC, camera)
    const hits = raycasterRef.current.intersectObject(mesh)
    const isHovered = hits.length > 0

    if (isHovered !== hoveredRef.current) {
      hoveredRef.current = isHovered
      setStairsHover(isHovered)
      onHoverRef.current?.(isHovered)
    }
  })

  if (!data) return null

  const { center, size } = data

  return (
    <mesh ref={hitboxRef} position={[center.x, center.y, center.z]}>
      <boxGeometry args={[size.x, size.y, size.z]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}
