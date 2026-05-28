import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStableInteractionCallback } from '../interactions/useStableInteractionCallback'

const CENTER_NDC = new THREE.Vector2(0, 0)
const DEFAULT_THOMAS_POSITION = [-3.0, 0.04, -13.259]

export function ClickableThomas({
  active,
  position = DEFAULT_THOMAS_POSITION,
  onInteract,
  onHoverChange,
}) {
  const { camera } = useThree()
  const hoveredRef = useRef(false)
  const prevHoveredRef = useRef(false)
  const meshRef = useRef()
  const raycaster = useRef(new THREE.Raycaster())
  const onInteractRef = useStableInteractionCallback(onInteract)

  useEffect(() => {
    const onPointerDown = (event) => {
      if (event.button !== 0 || !hoveredRef.current) return
      onInteractRef.current?.()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [onInteractRef])

  useFrame(() => {
    if (!active || !meshRef.current) {
      hoveredRef.current = false
      if (prevHoveredRef.current) {
        prevHoveredRef.current = false
        onHoverChange?.(false)
      }
      return
    }
    raycaster.current.setFromCamera(CENTER_NDC, camera)
    const hits = raycaster.current.intersectObject(meshRef.current)
    hoveredRef.current = hits.length > 0
    if (hoveredRef.current !== prevHoveredRef.current) {
      prevHoveredRef.current = hoveredRef.current
      onHoverChange?.(hoveredRef.current)
    }
  })

  return (
    <mesh ref={meshRef} position={[position[0], position[1] + 0.9, position[2]]}>
      <boxGeometry args={[0.7, 1.8, 0.7]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}
