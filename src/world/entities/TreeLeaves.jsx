import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import outlineVert from '../materials/leafOutline.vert.glsl'
import outlineFrag from '../materials/leafOutline.frag.glsl'

const _instanceMatrix = new THREE.Matrix4()
const _worldMatrix = new THREE.Matrix4()
const _pos = new THREE.Vector3()
const _quat = new THREE.Quaternion()
const _scl = new THREE.Vector3()

// Module-level singleton — ShaderMaterial created once, never disposed
const _outlineMaterial = new THREE.ShaderMaterial({
  vertexShader: outlineVert,
  fragmentShader: outlineFrag,
  side: THREE.BackSide,
})

export function TreeLeaves({ leafMesh }) {
  const proxyRef = useRef(null)

  useEffect(() => {
    if (!leafMesh) return
    return () => {
      leafMesh.raycast = () => {}
    }
  }, [leafMesh])

  if (!leafMesh) return null

  function syncProxy(id) {
    if (!proxyRef.current) return
    leafMesh.getMatrixAt(id, _instanceMatrix)
    // Instance world matrix = InstancedMesh.matrixWorld × instance local matrix
    _worldMatrix.multiplyMatrices(leafMesh.matrixWorld, _instanceMatrix)
    // Decompose, scale 1.1× so back faces extend past leaf edges, recompose
    _worldMatrix.decompose(_pos, _quat, _scl)
    _scl.multiplyScalar(1.1)
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
          // Direct mutation — no useState, no re-render
          if (proxyRef.current) proxyRef.current.visible = true
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          if (proxyRef.current) proxyRef.current.visible = false
          document.body.style.cursor = 'default'
        }}
      />

      {/* Proxy always mounted — visible=false means 0 draw calls, 0 triangles counted */}
      <mesh
        ref={proxyRef}
        geometry={leafMesh.geometry}
        material={_outlineMaterial}
        visible={false}
        matrixAutoUpdate={false}
      />
    </>
  )
}
