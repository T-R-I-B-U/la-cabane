import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { FLOOR_Y } from '../../core/SceneConfig'
import { useStableInteractionCallback } from '../interactions/useStableInteractionCallback'

const CENTER_NDC = new THREE.Vector2(0, 0)
// Matches Thomas's absolute position in SceneCharacters.jsx.
const THOMAS_POSITION = [-3.0, FLOOR_Y + 0.9, -13.259]

export function ClickableThomas({ active, onInteract }) {
  const { camera } = useThree()
  const hoveredRef = useRef(false)
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
      return
    }
    raycaster.current.setFromCamera(CENTER_NDC, camera)
    const hits = raycaster.current.intersectObject(meshRef.current)
    hoveredRef.current = hits.length > 0
  })

  return (
    <mesh ref={meshRef} position={THOMAS_POSITION}>
      <boxGeometry args={[0.7, 1.8, 0.7]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  )
}
