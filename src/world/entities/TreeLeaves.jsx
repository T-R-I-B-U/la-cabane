import { useEffect, useRef, useMemo } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createConditionalEdgesGeometry } from '../../utils/ConditionalEdgesGeometry'
import conditionalLineVertShader from '../materials/conditionalLine.vert.glsl'
import conditionalLineFragShader from '../materials/conditionalLine.frag.glsl'

const _instanceMatrix = new THREE.Matrix4()
const _worldMatrix = new THREE.Matrix4()
const _pos = new THREE.Vector3()
const _quat = new THREE.Quaternion()
const _scl = new THREE.Vector3()
const _color = new THREE.Color()
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
const LOD_DISTANCE_SQ = 10 * 10

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

export function TreeLeaves({ leafMesh, onLeafClick, onLeafHover }) {
  const proxyRef = useRef(null)
  const inRangeRef = useRef(null)
  const { gl } = useThree()

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
    const t = state.clock.elapsedTime
    const cam = state.camera.position
    for (let i = 0; i < leafMesh.count; i++) {
      const dx = basePositions[i * 3] - cam.x
      const dy = basePositions[i * 3 + 1] - cam.y
      const dz = basePositions[i * 3 + 2] - cam.z
      if (dx * dx + dy * dy + dz * dz > LOD_DISTANCE_SQ) {
        inRangeRef.current[i] = 0
        leafMesh.setMatrixAt(i, baseMatrices[i])
        continue
      }
      inRangeRef.current[i] = 1
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
    leafMesh.instanceMatrix.needsUpdate = true
  })
  /* eslint-enable react-hooks/immutability */

  const edgesGeometry = useMemo(() => {
    if (!leafMesh) return null
    // Threshold angle determines which internal edges are pre-filtered out (e.g. 40 degrees)
    const baseGeo = createConditionalEdgesGeometry(leafMesh.geometry, 40)
    // Create an instanced geometry to simulate thickness by drawing the line multiple times
    const instancedGeo = new THREE.InstancedBufferGeometry()
    instancedGeo.copy(baseGeo)

    // Generate offsets and opacities for a glow effect
    const radius = 3 // px radius for glow
    const offsets = []
    const opacities = []

    for (let x = -radius; x <= radius; x++) {
      for (let y = -radius; y <= radius; y++) {
        const dist = Math.sqrt(x * x + y * y)
        if (dist <= radius) {
          offsets.push(x, y)
          // Stronger opacity in the center, decaying towards the edges
          const op = Math.max(0, 1.0 - dist / radius)
          // Use a power for a softer falloff
          opacities.push(Math.pow(op, 1.5) * 0.4) // reduce max opacity because they add up
        }
      }
    }

    instancedGeo.setAttribute(
      'instanceOffset',
      new THREE.InstancedBufferAttribute(new Float32Array(offsets), 2)
    )
    instancedGeo.setAttribute(
      'instanceOpacity',
      new THREE.InstancedBufferAttribute(new Float32Array(opacities), 1)
    )
    instancedGeo.instanceCount = offsets.length / 2

    return instancedGeo
  }, [leafMesh])

  const _outlineMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: conditionalLineVertShader,
      fragmentShader: conditionalLineFragShader,
      uniforms: {
        diffuse: { value: new THREE.Color(0xffffff) },
        opacity: { value: 1.0 },
        resolution: { value: new THREE.Vector2() },
      },
      transparent: true,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    })
  }, [])

  // Keep resolution uniform updated so the thickness is consistent in pixel scale
  useEffect(() => {
    const updateResolution = () => {
      const canvas = gl.domElement
      // Use pixel ratio to maintain consistent real pixel thickness
      const pixelRatio = gl.getPixelRatio()
      _outlineMaterial.uniforms.resolution.value.set(
        canvas.clientWidth * pixelRatio,
        canvas.clientHeight * pixelRatio
      )
    }
    updateResolution()
    window.addEventListener('resize', updateResolution)
    return () => window.removeEventListener('resize', updateResolution)
  }, [gl, _outlineMaterial])

  useEffect(() => {
    if (!leafMesh) return
    const originalRaycast = leafMesh.raycast

    // Ensure raycasting hits from both sides if the material doesn't already allow it
    // Sometimes thin models are hard to hover from behind.
    // If leaf material uses FrontSide, backfaces won't be picked up by raycaster.
    const origSide = leafMesh.material.side
    // eslint-disable-next-line react-hooks/immutability
    leafMesh.material.side = THREE.DoubleSide

    return () => {
      leafMesh.raycast = originalRaycast

      leafMesh.material.side = origSide
    }
  }, [leafMesh])

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
          e.stopPropagation()
          const id = e.instanceId
          if (id === undefined || !inRangeRef.current?.[id]) return
          syncProxy(id)
          if (proxyRef.current) proxyRef.current.visible = true
          onLeafHover?.(true)
        }}
        onPointerOut={() => {
          if (proxyRef.current) proxyRef.current.visible = false
          onLeafHover?.(false)
        }}
        onClick={(e) => {
          e.stopPropagation()
          if (e.instanceId === undefined || !inRangeRef.current?.[e.instanceId] || !onLeafClick) return
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
