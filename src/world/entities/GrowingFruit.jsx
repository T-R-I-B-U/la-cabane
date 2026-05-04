import { useMemo, useEffect, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { disposeObject3D } from '../../core/disposeObject3D'

const PURPLE = new THREE.Color('#7c3aed')

const GROW_DURATION = 3.0 // seconds: scale 0 → 1
const CYCLE_DURATION = 6.0 // seconds: total period before restart

// Fast start, decelerates into full size
function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4)
}

// Positioned near the platform-facing leaves (~platform height, trunk x/z side)
const DEFAULT_POSITION = [-25.5, 25.5, -9]

export function GrowingFruit({ position = DEFAULT_POSITION }) {
  const { scene } = useGLTF('/models/growingfruit.gltf')
  const pivotRef = useRef()
  const elapsedRef = useRef(0)

  const cloned = useMemo(() => {
    const c = scene.clone(true)

    // Shift mesh down so its top sits at y=0 — scale then grows downward from the attachment point
    const box = new THREE.Box3().setFromObject(c)
    c.position.y = -box.max.y

    c.traverse((obj) => {
      if (!obj.isMesh) return
      obj.material = new THREE.MeshStandardMaterial({
        color: PURPLE,
        roughness: 0.5,
        metalness: 0.0,
      })
    })
    return c
  }, [scene])

  useEffect(() => {
    return () => disposeObject3D(cloned)
  }, [cloned])

  useFrame((_, delta) => {
    if (!pivotRef.current) return
    elapsedRef.current = (elapsedRef.current + delta) % CYCLE_DURATION
    // Only animate during the grow phase; hold at full scale for the remainder
    const t = Math.min(elapsedRef.current / GROW_DURATION, 1)
    const s = easeOutQuart(t)
    pivotRef.current.scale.setScalar(s)
  })

  return (
    // Outer group fixes the world position; inner pivot scales from origin (base of fruit)
    <group position={position}>
      <group ref={pivotRef}>
        <primitive object={cloned} />
      </group>
    </group>
  )
}
