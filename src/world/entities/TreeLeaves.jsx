import { useState, useEffect, useRef } from 'react'
import { Select } from '@react-three/postprocessing'
import * as THREE from 'three'

// ── DEBUG: leaf hover visibility — delete this block before ship ──────────────
const DEBUG_LEAF_COLOR = true
const DEBUG_LEAF_COLOR_VALUE = 0x1a4d1a // dark green
// ─────────────────────────────────────────────────────────────────────────────

// Reused across pointer events to avoid per-event allocations
const _instanceMatrix = new THREE.Matrix4()

// Outlines only the specific hovered instance, not the full 32K mesh.
// Strategy: a single invisible proxy <mesh> mirrors the hovered instance's world
// transform; only the proxy enters <Select>, so Outline never touches the InstancedMesh.
export function TreeLeaves({ leafMesh }) {
  const [isHovered, setIsHovered] = useState(false)
  const proxyRef = useRef(null)
  const originalColor = useRef(null)

  // DEBUG: override leaf material color for hover visibility — remove with block above
  useEffect(() => {
    if (!DEBUG_LEAF_COLOR || !leafMesh?.material) return
    originalColor.current = leafMesh.material.color.getHex()
    leafMesh.material.color.setHex(DEBUG_LEAF_COLOR_VALUE)
    return () => {
      if (originalColor.current !== null) leafMesh.material.color.setHex(originalColor.current)
    }
  }, [leafMesh])

  useEffect(() => {
    if (!leafMesh) return
    return () => {
      leafMesh.raycast = () => {}
    }
  }, [leafMesh])

  if (!leafMesh) return null

  function syncProxy(id) {
    if (!proxyRef.current) return
    // World transform = InstancedMesh.matrixWorld × instance local matrix
    leafMesh.getMatrixAt(id, _instanceMatrix)
    proxyRef.current.matrix.multiplyMatrices(leafMesh.matrixWorld, _instanceMatrix)
    // matrixAutoUpdate=false → Three.js won't overwrite .matrix from pos/quat/scale
    proxyRef.current.matrixAutoUpdate = false
    // Force world matrix recompute on next render
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
          // Sync proxy before setIsHovered so position is correct when it becomes visible
          syncProxy(id)
          setIsHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setIsHovered(false)
          document.body.style.cursor = 'default'
        }}
      />

      {/* Proxy always mounted to avoid mount latency on first hover.
          Invisible until hover so it never renders at identity position. */}
      <Select enabled={isHovered}>
        <mesh
          ref={proxyRef}
          geometry={leafMesh.geometry}
          material={leafMesh.material}
          visible={isHovered}
          matrixAutoUpdate={false}
        />
      </Select>
    </>
  )
}
