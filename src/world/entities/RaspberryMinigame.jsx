import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'

// ── Basket ────────────────────────────────────────────────────────────────────
const BASKET_LOCAL_POS = [0, 0.1, 0.6]
const BASKET_RADIUS = 0.8

// 8 slots for collected raspberries inside the basket
const BASKET_SLOTS = [
  [0.0, 0.08, 0.0],
  [0.05, 0.08, 0.04],
  [-0.05, 0.08, 0.04],
  [0.04, 0.08, -0.04],
  [-0.04, 0.08, -0.04],
  [0.01, 0.13, 0.02],
  [-0.04, 0.13, 0.01],
  [0.03, 0.13, -0.03],
]
const BASKET_SCALE_IN = 0.22

// ── Raspberries — 8 ripe + 4 unripe across 6 bushes ──────────────────────────
// Positions are local to the <RaspberryMinigame> group.
// Calibrate by inspecting the serre GLTF in dev (group.traverse(c => console.log(c.name, c.position))).
const RASPBERRY_DEFS = [
  { position: [-1.5, 0.6, 0.85], isRipe: true },
  { position: [-1.62, 0.56, 0.87], isRipe: true },
  { position: [-1.0, 0.7, 1.2], isRipe: true },
  { position: [-0.85, 0.66, 1.3], isRipe: false },
  { position: [-1.8, 0.6, 0.62], isRipe: true },
  { position: [-1.67, 0.56, 0.64], isRipe: true },
  { position: [1.6, 0.7, 1.0], isRipe: true },
  { position: [1.75, 0.66, 1.1], isRipe: false },
  { position: [2.0, 0.72, 1.0], isRipe: true },
  { position: [1.85, 0.68, 0.9], isRipe: true },
  { position: [1.2, 0.68, 1.1], isRipe: false },
  { position: [1.35, 0.64, 1.2], isRipe: false },
]

// ── Basket (GLB) ──────────────────────────────────────────────────────────────
function Basket() {
  const { scene } = useGLTF('/models/basket.glb')
  const cloned = useMemo(() => scene.clone(true), [scene])
  return <primitive object={cloned} position={BASKET_LOCAL_POS} scale={0.75} />
}

// ── Draggable raspberry ───────────────────────────────────────────────────────
function RaspberryInstance({
  definition,
  index,
  isActive,
  onCollected,
  onUnripeAttempt,
  debugMode,
  groupRef,
}) {
  const { scene } = useGLTF('/models/raspberry.gltf')

  const colorMapRaw = useTexture('/textures/raspberry-color.png')
  const roughnessMap = useTexture('/textures/raspberry-roughness.png')
  const metalnessMap = useTexture('/textures/raspberry-metallic.png')

  const originPos = definition.position
  const baseScale = definition.isRipe ? 0.46 : 0.38

  // Refs for per-frame state — avoids setState in useFrame which causes freeze
  const meshRef = useRef()
  const posRef = useRef([...originPos])
  const collectedSlotRef = useRef(null)
  const animScaleRef = useRef(baseScale)

  const dragging = useRef(false)
  const _hit = useMemo(() => new THREE.Vector3(), [])
  const _raycaster = useMemo(() => new THREE.Raycaster(), [])
  const _basketPos = useMemo(() => new THREE.Vector3(...BASKET_LOCAL_POS), [])
  const dragPlane = useRef(new THREE.Plane())

  const material = useMemo(() => {
    if (definition.isRipe) {
      const colorMap = colorMapRaw.clone()
      colorMap.colorSpace = THREE.SRGBColorSpace
      colorMap.needsUpdate = true
      return new THREE.MeshStandardMaterial({
        map: colorMap,
        roughnessMap,
        metalnessMap,
        roughness: 1.0,
        metalness: 0.1,
      })
    }
    return new THREE.MeshStandardMaterial({
      color: '#9ab84a',
      roughnessMap,
      metalnessMap,
      roughness: 0.85,
      metalness: 0.05,
    })
  }, [definition.isRipe, colorMapRaw, roughnessMap, metalnessMap])

  const cloned = useMemo(() => {
    const c = scene.clone(true)
    c.traverse((child) => {
      if (child.isMesh) child.material = material
    })
    return c
  }, [scene, material])

  useEffect(() => {
    cloned.traverse((child) => {
      if (!child.isMesh) return
      child.material.depthTest = !debugMode
      child.material.depthWrite = !debugMode
      child.renderOrder = debugMode ? 999 : 0
    })
  }, [cloned, debugMode])

  // Release drag if pointer exits the window
  useEffect(() => {
    const onGlobalUp = () => {
      if (!dragging.current) return
      dragging.current = false
      document.body.style.cursor = 'auto'
      posRef.current = [...originPos]
      meshRef.current?.position.set(...originPos)
    }
    window.addEventListener('pointerup', onGlobalUp)
    return () => window.removeEventListener('pointerup', onGlobalUp)
  }, [originPos])

  const onPointerDown = useCallback(
    (e) => {
      if (!isActive || collectedSlotRef.current !== null) return
      e.stopPropagation()
      // Drag plane faces the camera — works regardless of serre orientation
      const camDir = new THREE.Vector3()
      e.camera.getWorldDirection(camDir)
      dragPlane.current.setFromNormalAndCoplanarPoint(camDir.negate(), e.point)
      dragging.current = true
      document.body.style.cursor = 'grabbing'
    },
    [isActive]
  )

  const onPointerUp = useCallback(() => {
    if (!dragging.current) return
    dragging.current = false
    document.body.style.cursor = 'auto'

    const current = new THREE.Vector3(...posRef.current)
    if (current.distanceTo(_basketPos) < BASKET_RADIUS) {
      if (!definition.isRipe) {
        onUnripeAttempt?.()
        posRef.current = [...originPos]
        meshRef.current?.position.set(...originPos)
      } else {
        const slot = onCollected(index)
        collectedSlotRef.current = slot
      }
    } else {
      posRef.current = [...originPos]
      meshRef.current?.position.set(...originPos)
    }
  }, [_basketPos, originPos, onCollected, onUnripeAttempt, definition.isRipe, index])

  useFrame(({ camera, pointer }) => {
    if (collectedSlotRef.current !== null) {
      const s = BASKET_SLOTS[collectedSlotRef.current]
      const tx = BASKET_LOCAL_POS[0] + s[0]
      const ty = BASKET_LOCAL_POS[1] + s[1]
      const tz = BASKET_LOCAL_POS[2] + s[2]
      const [cx, cy, cz] = posRef.current
      const dx = tx - cx
      const dy = ty - cy
      const dz = tz - cz
      if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) > 0.002) {
        const nx = cx + dx * 0.12
        const ny = cy + dy * 0.12
        const nz = cz + dz * 0.12
        posRef.current = [nx, ny, nz]
        meshRef.current?.position.set(nx, ny, nz)
      }
      const scale = animScaleRef.current
      const diff = BASKET_SCALE_IN - scale
      if (Math.abs(diff) > 0.001) {
        const ns = scale + diff * 0.12
        animScaleRef.current = ns
        meshRef.current?.scale.setScalar(ns)
      }
      return
    }

    if (!dragging.current) return
    _raycaster.setFromCamera(pointer, camera)
    if (_raycaster.ray.intersectPlane(dragPlane.current, _hit) && groupRef.current) {
      // Convert world hit to local group space for position-agnostic mounting
      const local = groupRef.current.worldToLocal(_hit.clone())
      const nx = local.x
      const ny = Math.max(local.y, 0.08)
      const nz = local.z
      posRef.current = [nx, ny, nz]
      meshRef.current?.position.set(nx, ny, nz)
    }
  })

  return (
    <primitive
      ref={meshRef}
      object={cloned}
      position={originPos}
      scale={baseScale}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerEnter={() => {
        if (isActive && collectedSlotRef.current === null) document.body.style.cursor = 'grab'
      }}
      onPointerLeave={() => {
        if (!dragging.current) document.body.style.cursor = 'auto'
      }}
    />
  )
}

// ── Main component ────────────────────────────────────────────────────────────
// Mount with a position prop to place inside the serre in world space.
// Raspberry positions in RASPBERRY_DEFS are local to this group — calibrate in dev.
export function RaspberryMinigame({
  isActive,
  onStateChange,
  onUnripeAttempt,
  debugMode = false,
  ...groupProps
}) {
  const [collected, setCollected] = useState([])
  const groupRef = useRef()

  const handleCollected = useCallback(
    (idx) => {
      let slotIdx = 0
      setCollected((prev) => {
        slotIdx = prev.length
        const next = [...prev, idx]
        onStateChange?.({ active: true, count: next.length, complete: next.length >= 8 })
        return next
      })
      return slotIdx
    },
    [onStateChange]
  )

  const complete = collected.length >= 8

  return (
    <group ref={groupRef} {...groupProps}>
      <Basket />
      {RASPBERRY_DEFS.map((def, i) => (
        <RaspberryInstance
          key={i}
          definition={def}
          index={i}
          isActive={isActive && !complete}
          onCollected={handleCollected}
          onUnripeAttempt={onUnripeAttempt}
          debugMode={debugMode}
          groupRef={groupRef}
        />
      ))}
    </group>
  )
}

useGLTF.preload('/models/basket.glb')
useGLTF.preload('/models/raspberry.gltf')
