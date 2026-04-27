import { useEffect, useRef, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { createConditionalEdgesGeometry } from '../../utils/ConditionalEdgesGeometry'
import conditionalLineVertShader from '../materials/conditionalLine.vert.glsl'
import conditionalLineFragShader from '../materials/conditionalLine.frag.glsl'

const _instanceMatrix = new THREE.Matrix4()
const _worldMatrix = new THREE.Matrix4()
const _pos = new THREE.Vector3()
const _quat = new THREE.Quaternion()
const _scl = new THREE.Vector3()

export function TreeLeaves({ leafMesh }) {
  const proxyRef = useRef(null)
  const { gl } = useThree()

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
          if (id === undefined) return
          syncProxy(id)
          if (proxyRef.current) proxyRef.current.visible = true
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          if (proxyRef.current) proxyRef.current.visible = false
          document.body.style.cursor = 'default'
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
