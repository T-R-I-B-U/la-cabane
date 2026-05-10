import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStableInteractionCallback } from '../interactions/useStableInteractionCallback'

const CENTER_NDC = new THREE.Vector2(0, 0)
const SHOW_DIST = 8
const COLOR_IDLE = new THREE.Color(0xffffff)
const COLOR_HOVER = new THREE.Color(0xffdd55)

// Interaction hotspot placed in front of an NPC.
// Kept invisible in the scene, but still raycastable for center-screen interaction.
// Fires onInteract on canvas click while hovered, onHoverChange when hover state changes.
export function InteractionPoint({
  position,
  active,
  onInteract,
  onHoverChange,
  maxDistance = SHOW_DIST,
}) {
  const { camera } = useThree()
  const meshRef = useRef()
  const materialRef = useRef()
  const hoveredRef = useRef(false)
  const raycaster = useRef(new THREE.Raycaster())
  const onInteractRef = useStableInteractionCallback(onInteract)
  const onHoverChangeRef = useStableInteractionCallback(onHoverChange)

  useEffect(() => {
    // Use document-level pointerdown: in pointer-lock mode, click events may be
    // dispatched to document.body rather than gl.domElement depending on the browser.
    const onPointerDown = (e) => {
      if (e.button !== 0) return
      if (hoveredRef.current) onInteractRef.current?.()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [onInteractRef])

  useFrame(() => {
    const mesh = meshRef.current
    const material = materialRef.current
    if (!mesh || !material) return

    // Billboard — always face the camera
    mesh.quaternion.copy(camera.quaternion)

    if (!active) {
      if (mesh.visible) mesh.visible = false
      if (hoveredRef.current) {
        hoveredRef.current = false
        onHoverChangeRef.current?.(false)
        material.color.copy(COLOR_IDLE)
      }
      return
    }

    const dist = camera.position.distanceTo(mesh.position)
    const visible = dist < maxDistance
    if (mesh.visible !== visible) mesh.visible = visible

    if (!visible) {
      if (hoveredRef.current) {
        hoveredRef.current = false
        onHoverChangeRef.current?.(false)
        material.color.copy(COLOR_IDLE)
      }
      return
    }

    raycaster.current.setFromCamera(CENTER_NDC, camera)
    const hits = raycaster.current.intersectObject(mesh)
    const isHovered = hits.length > 0

    if (isHovered !== hoveredRef.current) {
      hoveredRef.current = isHovered
      onHoverChangeRef.current?.(isHovered)
      material.color.copy(isHovered ? COLOR_HOVER : COLOR_IDLE)
    }
  })

  return (
    <mesh ref={meshRef} position={position} visible={false}>
      <circleGeometry args={[0.18, 32]} />
      <meshBasicMaterial
        ref={materialRef}
        color={COLOR_IDLE}
        side={THREE.DoubleSide}
        transparent
        opacity={0}
        depthTest={false}
      />
    </mesh>
  )
}
