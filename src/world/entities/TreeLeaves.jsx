import { use, useEffect, useRef, useMemo } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { preferKtx2, loadStandaloneTexture } from '../cabane/textureResolver.js'
import {
  createOutlineGeometry,
  createOutlineMaterial,
  useOutlineResolution,
} from '../materials/outlineEffect'
import { useHoverEffect } from '../interactions/useHoverEffect'

const _instanceMatrix = new THREE.Matrix4()
const _worldMatrix = new THREE.Matrix4()
const _pos = new THREE.Vector3()
const _quat = new THREE.Quaternion()
const _scl = new THREE.Vector3()
const _color = new THREE.Color()
const _inverseMatrix = new THREE.Matrix4()
const _localCam = new THREE.Vector3()
// Scratch objects for animation — reused each frame to avoid GC pressure
const _offset = new THREE.Matrix4()
const _final = new THREE.Matrix4()
const _euler = new THREE.Euler()

const PROFILE_COUNT = 20
const ANIM_SEED = 42
const TINT_SEED = 137
const TINT_MIN = 0.45 // darkest leaves — never fully black
const TINT_MAX = 1.0 // brightest leaves — full base color
// Feuilles au-delà de cette distance (world units) ne s'animent pas
const LOD_DISTANCE_SQ = 12 * 12

// Mulberry32 PRNG — fast, seedable, no dependency
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function TreeLeaves({
  leafMesh,
  active = true,
  onLeafClick,
  onLeafHover,
  leafMaterialMode = 'standard',
}) {
  const proxyRef = useRef(null)
  const inRangeRef = useRef(null)
  const { gl } = useThree()

  const alphaMap = use(
    loadStandaloneTexture(preferKtx2('/textures/detailedleaf-alphamap.png'), { flipY: false })
  )

  // Cache original material values to restore them on unmount or mode change
  const originalProps = useMemo(() => {
    if (!leafMesh) return null
    return {
      material: leafMesh.material,
      alphaMap: leafMesh.material.alphaMap,
      transparent: leafMesh.material.transparent,
      alphaTest: leafMesh.material.alphaTest,
      side: leafMesh.material.side,
      emissive: leafMesh.material.emissive?.clone() || new THREE.Color(0, 0, 0),
      emissiveIntensity: leafMesh.material.emissiveIntensity || 0,
    }
  }, [leafMesh])

  // Cache des matrices de base — source de vérité immuable
  const baseMatrices = useMemo(() => {
    if (!leafMesh) return null
    const mats = []
    const m = new THREE.Matrix4()
    for (let i = 0; i < leafMesh.count; i++) {
      leafMesh.getMatrixAt(i, m)
      mats.push(m.clone())
    }
    return mats
  }, [leafMesh])

  // 20 profils d'animation seedés — reproductibles à chaque reload
  const animProfiles = useMemo(() => {
    const rand = mulberry32(ANIM_SEED)
    return Array.from({ length: PROFILE_COUNT }, () => ({
      freqX: 0.3 + rand() * 0.8,
      freqZ: 0.3 + rand() * 0.8,
      freqY: 0.2 + rand() * 0.6,
      ampRotX: 0.04 + rand() * 0.08,
      ampRotZ: 0.04 + rand() * 0.08,
      ampPosY: 0.005 + rand() * 0.03,
      phaseX: rand() * Math.PI * 2,
      phaseZ: rand() * Math.PI * 2,
      phaseY: rand() * Math.PI * 2,
    }))
  }, [])

  // Assignation déterministe profil → instance (hash de Knuth)
  const profileIndex = useMemo(() => {
    if (!leafMesh) return null
    const indices = new Uint8Array(leafMesh.count)
    for (let i = 0; i < leafMesh.count; i++) {
      indices[i] = ((i * 2654435761) >>> 0) % PROFILE_COUNT
    }
    return indices
  }, [leafMesh])

  // Positions de base extraites des matrices (colonne de translation, index 12-14)
  const basePositions = useMemo(() => {
    if (!leafMesh) return null
    const pos = new Float32Array(leafMesh.count * 3)
    const m = new THREE.Matrix4()
    for (let i = 0; i < leafMesh.count; i++) {
      leafMesh.getMatrixAt(i, m)
      pos[i * 3] = m.elements[12]
      pos[i * 3 + 1] = m.elements[13]
      pos[i * 3 + 2] = m.elements[14]
    }
    return pos
  }, [leafMesh])

  const { onPointerOver: hoverOver, onPointerOut: hoverOut } = useHoverEffect({
    active,
    onHover: () => onLeafHover?.(true),
    onOut: () => onLeafHover?.(false),
  })

  useEffect(() => {
    if (!leafMesh) return
    const rand = mulberry32(TINT_SEED)
    for (let i = 0; i < leafMesh.count; i++) {
      const g = TINT_MIN + rand() * (TINT_MAX - TINT_MIN)
      leafMesh.setColorAt(i, _color.setRGB(g, g, g))
    }
    if (leafMesh.instanceColor) {
      // eslint-disable-next-line react-hooks/immutability
      leafMesh.instanceColor.needsUpdate = true
    }
  }, [leafMesh])

  /* eslint-disable react-hooks/immutability */
  useFrame((state) => {
    if (!leafMesh || !baseMatrices || !profileIndex || !basePositions) return
    if (!inRangeRef.current) inRangeRef.current = new Uint8Array(leafMesh.count)

    // Transform camera to local space for LOD distance check
    _inverseMatrix.copy(leafMesh.matrixWorld).invert()
    _localCam.copy(state.camera.position).applyMatrix4(_inverseMatrix)

    const t = state.clock.elapsedTime
    let hasAnimated = false
    for (let i = 0; i < leafMesh.count; i++) {
      const dx = basePositions[i * 3] - _localCam.x
      const dy = basePositions[i * 3 + 1] - _localCam.y
      const dz = basePositions[i * 3 + 2] - _localCam.z

      if (dx * dx + dy * dy + dz * dz > LOD_DISTANCE_SQ) {
        if (inRangeRef.current[i]) {
          inRangeRef.current[i] = 0
          leafMesh.setMatrixAt(i, baseMatrices[i])
          hasAnimated = true
        }
        continue
      }
      inRangeRef.current[i] = 1
      hasAnimated = true
      const p = animProfiles[profileIndex[i]]
      _euler.set(
        Math.sin(t * p.freqX + p.phaseX) * p.ampRotX,
        0,
        Math.sin(t * p.freqZ + p.phaseZ) * p.ampRotZ
      )
      _offset.makeRotationFromEuler(_euler)
      _offset.setPosition(0, Math.sin(t * p.freqY + p.phaseY) * p.ampPosY, 0)
      _final.multiplyMatrices(baseMatrices[i], _offset)
      leafMesh.setMatrixAt(i, _final)
    }
    if (hasAnimated) leafMesh.instanceMatrix.needsUpdate = true
  })
  /* eslint-enable react-hooks/immutability */

  const edgesGeometry = useMemo(() => {
    if (!leafMesh) return null
    return createOutlineGeometry(leafMesh.geometry, 40, 3)
  }, [leafMesh])

  const _outlineMaterial = useMemo(() => createOutlineMaterial(), [])

  useOutlineResolution(gl, _outlineMaterial)

  useEffect(() => {
    if (!leafMesh || !alphaMap || !originalProps) return
    const originalRaycast = leafMesh.raycast

    /* eslint-disable react-hooks/immutability */
    alphaMap.flipY = false
    alphaMap.colorSpace = THREE.LinearSRGBColorSpace
    alphaMap.needsUpdate = true

    // Force conversion to MeshPhysicalMaterial if needed
    if (leafMaterialMode === 'physical' && leafMesh.material.type !== 'MeshPhysicalMaterial') {
      const oldMat = leafMesh.material
      const newMat = new THREE.MeshPhysicalMaterial({
        color: oldMat.color,
        map: oldMat.map,
        normalMap: oldMat.normalMap,
        roughnessMap: oldMat.roughnessMap,
        metalnessMap: oldMat.metalnessMap,
        roughness: oldMat.roughness,
        metalness: oldMat.metalness,
        side: oldMat.side,
        emissive: oldMat.emissive,
        emissiveIntensity: oldMat.emissiveIntensity,
      })
      if (oldMat.normalScale) newMat.normalScale.copy(oldMat.normalScale)
      leafMesh.material = newMat
    } else if (
      leafMaterialMode !== 'physical' &&
      leafMesh.material.type === 'MeshPhysicalMaterial'
    ) {
      leafMesh.material = originalProps.material
    }

    const mat = leafMesh.material

    if (leafMaterialMode === 'physical') {
      // Option 1: Physical Translucency
      mat.transparent = true
      mat.opacity = 1.0
      mat.alphaMap = null
      mat.alphaTest = 0
      if ('transmission' in mat) {
        mat.transmission = 0.5
        mat.thickness = 1.0
        mat.ior = 1.45
      }
      mat.roughness = 0.3
      mat.side = THREE.DoubleSide
    } else if (leafMaterialMode === 'emissive') {
      // Option 3: Emissive simulation
      mat.transparent = false
      mat.opacity = 1
      mat.alphaMap = null
      mat.alphaTest = 0
      mat.emissive.setHex(0x446633)
      mat.emissiveIntensity = 1.0
      mat.side = THREE.DoubleSide
    } else {
      // Option Default: Standard material, no transparency, no emissive, no transmission
      mat.transparent = false
      mat.opacity = 1
      mat.alphaMap = null
      mat.alphaTest = 0
      mat.emissive.setHex(0x000000)
      mat.emissiveIntensity = 0
      mat.transmission = 0
      mat.side = THREE.DoubleSide
    }

    mat.needsUpdate = true
    /* eslint-enable react-hooks/immutability */

    return () => {
      leafMesh.raycast = originalRaycast
      leafMesh.material = originalProps.material
      originalProps.material.side = originalProps.side
      originalProps.material.alphaMap = originalProps.alphaMap
      originalProps.material.transparent = originalProps.transparent
      originalProps.material.alphaTest = originalProps.alphaTest
      if (originalProps.material.emissive)
        originalProps.material.emissive.copy(originalProps.emissive)
      originalProps.material.emissiveIntensity = originalProps.emissiveIntensity
      originalProps.material.needsUpdate = true
    }
  }, [leafMesh, alphaMap, leafMaterialMode, originalProps])

  if (!leafMesh || !edgesGeometry) return null

  function syncProxy(id) {
    if (!proxyRef.current) return
    leafMesh.getMatrixAt(id, _instanceMatrix)
    // Instance world matrix = InstancedMesh.matrixWorld × instance local matrix
    _worldMatrix.multiplyMatrices(leafMesh.matrixWorld, _instanceMatrix)
    // Decompose and recompose (no 1.1 scale anymore, exact 1:1 match)
    _worldMatrix.decompose(_pos, _quat, _scl)
    proxyRef.current.matrix.compose(_pos, _quat, _scl)
    proxyRef.current.matrixAutoUpdate = false
    proxyRef.current.matrixWorldNeedsUpdate = true
  }

  return (
    <>
      <primitive
        object={leafMesh}
        onPointerMove={(e) => {
          if (!active) return
          const id = e.instanceId
          if (id === undefined || !inRangeRef.current?.[id]) return
          syncProxy(id)
          if (proxyRef.current) proxyRef.current.visible = true
          hoverOver(e)
        }}
        onPointerOut={(e) => {
          if (proxyRef.current) proxyRef.current.visible = false
          hoverOut(e)
        }}
        onPointerDown={(e) => {
          e.stopPropagation()
          if (
            !active ||
            e.instanceId === undefined ||
            !inRangeRef.current?.[e.instanceId] ||
            !onLeafClick
          )
            return

          onLeafClick(e.instanceId)
        }}
      />

      <lineSegments
        ref={proxyRef}
        geometry={edgesGeometry}
        material={_outlineMaterial}
        visible={false}
        matrixAutoUpdate={false}
      />
    </>
  )
}
