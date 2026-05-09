import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'

// ── Constants ─────────────────────────────────────────────────────────────────
const BASKET_LOCAL_POS = [-0.4, -0.5, 0.6]
const BASKET_RADIUS = 0.8

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
const RIPE_COUNT = 8

// outsideplant02 fallback world position (from cabane.json)
const PLANT_WORLD_POS_FALLBACK = [32.8189, 1.5645, -5.6124]

// ── Extract raspberry positions from outsideplant02 ───────────────────────────
function extractRaspberries(cabane) {
  if (!cabane) return null

  // outsideplant02.gltf has 4 internal nodes named 'outsideplant02'.
  // Only the buildNode wrapper has userData.cabaneNode=true — target that one.
  let plant = null
  cabane.traverse((child) => {
    if (!plant && child.name === 'outsideplant02' && child.userData?.cabaneNode) {
      plant = child
    }
  })
  if (!plant) return null

  plant.updateWorldMatrix(true, true)

  const plantWorldPos = new THREE.Vector3()
  plant.getWorldPosition(plantWorldPos)

  const byGroup = new Map()
  plant.traverse((child) => {
    if (!child.isMesh || child.name !== 'raspberry') return
    const key = child.parent?.uuid ?? 'root'
    if (!byGroup.has(key)) byGroup.set(key, [])
    byGroup.get(key).push(child)
  })

  const selected = []
  for (const groupMeshes of byGroup.values()) {
    const take = Math.min(4, groupMeshes.length)
    for (let i = 0; i < take && selected.length < 12; i++) {
      selected.push(groupMeshes[i])
    }
  }

  const raspberryDefs = selected.map((mesh, i) => {
    const worldPos = new THREE.Vector3()
    mesh.getWorldPosition(worldPos)
    return {
      position: [
        worldPos.x - plantWorldPos.x,
        worldPos.y - plantWorldPos.y,
        worldPos.z - plantWorldPos.z,
      ],
      isRipe: i < RIPE_COUNT,
    }
  })

  return {
    groupPosition: [plantWorldPos.x, plantWorldPos.y, plantWorldPos.z],
    raspberryDefs,
    hiddenMeshes: selected,
  }
}

// ── Basket — exported for standalone preview in free exploration ──────────────
export function Basket({ position = BASKET_LOCAL_POS }) {
  const { scene } = useGLTF('/models/basket.glb')
  const cloned = useMemo(() => scene.clone(true), [scene])
  return <primitive object={cloned} position={position} scale={0.75} />
}

// ── Berry — uses R3F onPointerDown for reliable hit detection ─────────────────
function RaspberryInstance({ definition, onMeshRef, debugMode, onPointerDown }) {
  const { scene } = useGLTF('/models/raspberry.gltf')
  const colorMapRaw = useTexture('/textures/raspberry-color.png')
  const roughnessMap = useTexture('/textures/raspberry-roughness.png')
  const metalnessMap = useTexture('/textures/raspberry-metallic.png')

  const baseScale = definition.isRipe ? 0.46 : 0.38

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

  const callbackRef = useCallback((node) => { onMeshRef(node) }, [onMeshRef])

  return (
    <primitive
      ref={callbackRef}
      object={cloned}
      position={definition.position}
      scale={baseScale}
      onPointerDown={onPointerDown}
    />
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function RaspberryMinigame({
  isActive,
  cabane,
  onStateChange,
  onUnripeAttempt,
  debugMode = false,
}) {
  const { camera, gl } = useThree()
  const groupRef = useRef()

  const extracted = useMemo(() => extractRaspberries(cabane), [cabane])
  const groupPosition = useMemo(
    () => extracted?.groupPosition ?? PLANT_WORLD_POS_FALLBACK,
    [extracted]
  )
  const raspberryDefs = useMemo(() => extracted?.raspberryDefs ?? [], [extracted])

  // Hide static meshes in model during minigame
  useEffect(() => {
    const meshes = extracted?.hiddenMeshes
    if (!meshes) return
    meshes.forEach((m) => (m.visible = false))
    return () => meshes.forEach((m) => (m.visible = true))
  }, [extracted])

  // Per-berry state — all refs, no setState in frame loop
  const meshRegistryRef = useRef([])
  const posRefs = useRef([])
  const collectedSlots = useRef([])
  const animScales = useRef([])
  const collectedCountRef = useRef(0)

  // meshRegistryRef is intentionally NOT reset here — children's callback refs fire
  // during React's commit phase (before passive effects). Resetting here would wipe them.
  useEffect(() => {
    posRefs.current = raspberryDefs.map((d) => [...d.position])
    collectedSlots.current = raspberryDefs.map(() => null)
    animScales.current = raspberryDefs.map((d) => (d.isRipe ? 0.46 : 0.38))
    collectedCountRef.current = 0
  }, [raspberryDefs])

  const handleMeshRef = useCallback(
    (index) => (node) => {
      meshRegistryRef.current[index] = node
    },
    []
  )

  // Drag state
  const draggedIndexRef = useRef(null)
  const dragPlane = useRef(new THREE.Plane())
  const pointerNdcRef = useRef(new THREE.Vector2())
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const _hit = useMemo(() => new THREE.Vector3(), [])
  const _basketPos = useMemo(() => new THREE.Vector3(...BASKET_LOCAL_POS), [])

  // Release pointer lock when minigame becomes active
  useEffect(() => {
    if (!isActive) return
    if (document.pointerLockElement) document.exitPointerLock()
    document.body.style.cursor = 'auto'
    return () => {
      document.body.style.cursor = ''
    }
  }, [isActive])

  const toNDC = useCallback(
    (e) => {
      if (document.pointerLockElement) {
        pointerNdcRef.current.set(0, 0)
        return pointerNdcRef.current
      }
      const rect = gl.domElement.getBoundingClientRect()
      pointerNdcRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      pointerNdcRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      return pointerNdcRef.current
    },
    [gl]
  )

  // R3F onPointerDown per berry — avoids manual raycasting, fires naturally
  const handleBerryPointerDown = useCallback(
    (index, e) => {
      e.stopPropagation()
      if (!isActive || collectedSlots.current[index] !== null || collectedCountRef.current >= RIPE_COUNT)
        return
      const camDir = new THREE.Vector3()
      camera.getWorldDirection(camDir)
      dragPlane.current.setFromNormalAndCoplanarPoint(camDir.negate(), e.point)
      draggedIndexRef.current = index
      document.body.style.cursor = 'grabbing'
    },
    [isActive, camera]
  )

  // document-level move/up for drag tracking
  useEffect(() => {
    const onPointerMove = (e) => {
      toNDC(e)
      const idx = draggedIndexRef.current
      if (idx === null || !groupRef.current) return

      raycaster.setFromCamera(pointerNdcRef.current, camera)
      if (!raycaster.ray.intersectPlane(dragPlane.current, _hit)) return

      const local = groupRef.current.worldToLocal(_hit.clone())
      const nx = local.x
      const ny = Math.max(local.y, 0.08)
      const nz = local.z
      posRefs.current[idx] = [nx, ny, nz]
      meshRegistryRef.current[idx]?.position.set(nx, ny, nz)
    }

    const onPointerUp = () => {
      const idx = draggedIndexRef.current
      if (idx === null) return
      draggedIndexRef.current = null
      document.body.style.cursor = 'auto'

      const pos = posRefs.current[idx]
      const current = new THREE.Vector3(...pos)
      if (current.distanceTo(_basketPos) < BASKET_RADIUS) {
        const def = raspberryDefs[idx]
        if (!def.isRipe) {
          onUnripeAttempt?.()
          posRefs.current[idx] = [...raspberryDefs[idx].position]
          meshRegistryRef.current[idx]?.position.set(...raspberryDefs[idx].position)
        } else {
          const slot = collectedCountRef.current
          collectedCountRef.current += 1
          collectedSlots.current[idx] = slot
          const count = collectedCountRef.current
          onStateChange?.({ active: true, count, complete: count >= RIPE_COUNT })
        }
      } else {
        posRefs.current[idx] = [...raspberryDefs[idx].position]
        meshRegistryRef.current[idx]?.position.set(...raspberryDefs[idx].position)
      }
    }

    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', onPointerUp)
    return () => {
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
      document.body.style.cursor = 'auto'
    }
  }, [isActive, camera, gl, toNDC, raycaster, raspberryDefs, onStateChange, onUnripeAttempt, _basketPos, _hit])

  // Hover cursor + basket-snap / scale animation
  useFrame(() => {
    const idx = draggedIndexRef.current

    if (idx === null && isActive && collectedCountRef.current < RIPE_COUNT) {
      raycaster.setFromCamera(pointerNdcRef.current, camera)
      const pickable = meshRegistryRef.current.filter(
        (m, i) => m && collectedSlots.current[i] === null
      )
      const hits = pickable.length ? raycaster.intersectObjects(pickable, true) : []
      document.body.style.cursor = hits.length ? 'grab' : 'auto'
    }

    for (let i = 0; i < raspberryDefs.length; i++) {
      const slot = collectedSlots.current[i]
      if (slot === null) continue
      const mesh = meshRegistryRef.current[i]
      if (!mesh) continue

      const s = BASKET_SLOTS[slot]
      const tx = BASKET_LOCAL_POS[0] + s[0]
      const ty = BASKET_LOCAL_POS[1] + s[1]
      const tz = BASKET_LOCAL_POS[2] + s[2]
      const [cx, cy, cz] = posRefs.current[i]
      const dx = tx - cx,
        dy = ty - cy,
        dz = tz - cz
      if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) > 0.002) {
        const nx = cx + dx * 0.12
        const ny = cy + dy * 0.12
        const nz = cz + dz * 0.12
        posRefs.current[i] = [nx, ny, nz]
        mesh.position.set(nx, ny, nz)
      }
      const diff = BASKET_SCALE_IN - animScales.current[i]
      if (Math.abs(diff) > 0.001) {
        const ns = animScales.current[i] + diff * 0.12
        animScales.current[i] = ns
        mesh.scale.setScalar(ns)
      }
    }
  })

  return (
    <group ref={groupRef} position={groupPosition}>
      <Basket />
      {raspberryDefs.map((def, i) => (
        <RaspberryInstance
          key={i}
          definition={def}
          onMeshRef={handleMeshRef(i)}
          onPointerDown={(e) => handleBerryPointerDown(i, e)}
          debugMode={debugMode}
        />
      ))}
    </group>
  )
}

useGLTF.preload('/models/basket.glb')
useGLTF.preload('/models/raspberry.gltf')
useTexture.preload('/textures/raspberry-color.png')
useTexture.preload('/textures/raspberry-roughness.png')
useTexture.preload('/textures/raspberry-metallic.png')
