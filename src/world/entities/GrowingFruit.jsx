import { useMemo, useEffect, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { disposeObject3D } from '../../core/disposeObject3D'
import { applyAutoTextures } from '../cabane/textureResolver'

const GROW_DURATION = 3.0 // seconds: scale 0 → 1

// Fast start, decelerates into full size
function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4)
}

// Positioned near the platform-facing leaves (~platform height, trunk x/z side)
const DEFAULT_POSITION = [-25.5, 25.5, -9]

export function GrowingFruit({ position = DEFAULT_POSITION, playing = true, onComplete }) {
  const { scene } = useGLTF('/models/growingfruit.gltf')
  const pivotRef = useRef()
  const elapsedRef = useRef(0)
  const completedRef = useRef(false)
  const prevPlayingRef = useRef(playing)

  const cloned = useMemo(() => {
    const c = scene.clone(true)

    // Shift mesh down so its top sits at y=0 — scale then grows downward from the attachment point
    const box = new THREE.Box3().setFromObject(c)
    c.position.y = -box.max.y

    applyAutoTextures(c, 'growingfruit', ['/textures/'])
    return c
  }, [scene])

  useEffect(() => {
    return () => disposeObject3D(cloned)
  }, [cloned])

  useFrame((_, delta) => {
    if (!pivotRef.current) return

    // Reset when playing flips false → true
    if (playing && !prevPlayingRef.current) {
      elapsedRef.current = 0
      completedRef.current = false
    }
    prevPlayingRef.current = playing

    if (!playing) {
      pivotRef.current.scale.setScalar(0)
      return
    }

    if (elapsedRef.current < GROW_DURATION) elapsedRef.current += delta
    const t = Math.min(elapsedRef.current / GROW_DURATION, 1)
    const s = easeOutQuart(t)
    pivotRef.current.scale.setScalar(s)

    if (t >= 1 && !completedRef.current) {
      completedRef.current = true
      onComplete?.()
    }
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
