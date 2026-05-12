import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStableInteractionCallback } from '../interactions/useStableInteractionCallback'

const CENTER_NDC = new THREE.Vector2(0, 0)

const DEFAULT_ZOE_POSITION = [26.0, 0.04, -5.4]

export function ClickableZoe({ isInteractable, position = DEFAULT_ZOE_POSITION, onZoeTalk }) {
  const { camera } = useThree()
  const hoveredRef = useRef(false)
  const meshRef = useRef()
  const raycaster = useRef(new THREE.Raycaster())
  const onZoeTalkRef = useStableInteractionCallback(onZoeTalk)

  useEffect(() => {
    const onPointerDown = (event) => {
      if (event.button !== 0 || !hoveredRef.current) return
      onZoeTalkRef.current?.()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [onZoeTalkRef])

  useFrame(() => {
    if (!isInteractable || !meshRef.current) {
      hoveredRef.current = false
      return
    }
    raycaster.current.setFromCamera(CENTER_NDC, camera)
    const hits = raycaster.current.intersectObject(meshRef.current)
    hoveredRef.current = hits.length > 0
  })

  return (
    <mesh ref={meshRef} position={[position[0], position[1] + 0.9, position[2]]}>
      <boxGeometry args={[0.7, 1.8, 0.7]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  )
}
