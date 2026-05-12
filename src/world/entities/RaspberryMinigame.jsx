import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'

// ── Constants ─────────────────────────────────────────────────────────────────

// Where the basket.glb scene origin is placed (group-local space).
const BASKET_ORIGIN = [-0.1, -0.4, 0.2]

// basket.glb has FruitCrate2 at translation [-0.350, 0.109, 0.807] — scale 0.75 applied.
// Snap zone must be at the visual center of the crate opening, not at the scene origin.
const BASKET_SNAP = [
  BASKET_ORIGIN[0] + -0.35 * 0.75,
  BASKET_ORIGIN[1] + 0.109 * 0.75 + 0.05,
  BASKET_ORIGIN[2] + 0.807 * 0.75,
]
const BASKET_NDC_RADIUS = 0.2

// Berry slots: offsets from BASKET_SNAP center
const BASKET_SLOTS = [
  [0.0, -0.03, 0.0],
  [0.03, -0.03, 0.025],
  [-0.03, -0.03, 0.025],
  [0.025, -0.03, -0.025],
  [-0.025, -0.03, -0.025],
  [0.01, 0.01, 0.01],
  [-0.025, 0.01, 0.01],
  [0.02, 0.01, -0.02],
]
const BASKET_SCALE_IN = 0.035
const RIPE_COUNT = 8

// World position of the outsideplant03 cluster root, from cabane.json.
// Used as group anchor — never derived from the nodeBuilder wrapper (which is at y≈0).
const GROUP_WORLD_POS = [32.8189, 1.5645, -5.6124]

// Hardcoded berry positions in GROUP_WORLD_POS-local space.
// 3 clusters matching the 3 outsideplant03 sub-instances in the GLTF
// (raspberry groups at offsets ~[-0.01,0.78,-0.24], [-0.23,0.78,0.12], [0.24,0.78,0.11]).
const RASPBERRY_DEFS = [
  // cluster 1 — left stem, z≥0.20 to stay in front of leaves
  { position: [-0.01, 0.05, 0.22], isRipe: true },
  { position: [0.06, 0.18, 0.28], isRipe: true },
  { position: [-0.08, -0.05, 0.2], isRipe: false },
  { position: [0.02, 0.25, 0.25], isRipe: false },
  // cluster 2 — center-left stem
  { position: [-0.23, 0.05, 0.22], isRipe: true },
  { position: [-0.17, 0.18, 0.26], isRipe: true },
  { position: [-0.29, -0.05, 0.2], isRipe: true },
  { position: [-0.2, 0.25, 0.24], isRipe: false },
  // cluster 3 — right stem
  { position: [0.24, 0.05, 0.22], isRipe: true },
  { position: [0.3, 0.18, 0.26], isRipe: true },
  { position: [0.18, -0.05, 0.2], isRipe: true },
  { position: [0.26, 0.25, 0.24], isRipe: false },
]

// ── Hide static raspberry meshes in the cabane model during minigame ──────────
// function findStaticRaspberryMeshes(cabane) {
//   if (!cabane) return null
//   let plant = null
//   cabane.traverse((child) => {
//     if (!plant && child.name === 'outsideplant03' && child.userData?.cabaneNode) {
//       plant = child
//     }
//   })
//   if (!plant) return null
//   const meshes = []
//   plant.traverse((child) => {
//     if (child.isMesh && child.name === 'raspberry') meshes.push(child)
//   })
//   return meshes.length > 0 ? meshes : null
// }

// ── Basket — exported for standalone preview in free exploration ──────────────
export function Basket({ position = BASKET_ORIGIN }) {
  const { scene } = useGLTF('/models/basket.glb')
  const cloned = useMemo(() => scene.clone(true), [scene])
  return <primitive object={cloned} position={position} scale={0.75} />
}

// ── Berry — uses R3F onPointerDown for reliable hit detection ─────────────────
function RaspberryInstance({ definition, onMeshRef, onPointerDown }) {
  const { scene } = useGLTF('/models/raspberry.gltf')
  const colorMapRaw = useTexture('/textures/raspberry-color.png')
  const roughnessMap = useTexture('/textures/raspberry-roughness.png')
  const metalnessMap = useTexture('/textures/raspberry-metallic.png')

  const baseScale = definition.isRipe ? 0.07 : 0.06

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
      child.material.depthTest = false
      child.material.depthWrite = false
      child.renderOrder = 10
    })
  }, [cloned])

  const callbackRef = useCallback(
    (node) => {
      onMeshRef(node)
    },
    [onMeshRef]
  )

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
export function RaspberryMinigame({ isActive, onStateChange, onUnripeAttempt }) {
  const { camera, gl } = useThree()
  const groupRef = useRef()

  // Hide the static raspberry meshes in the cabane model while minigame is active
  // useEffect(() => {
  //   const meshes = findStaticRaspberryMeshes(cabane)
  //   if (!meshes) return
  //   meshes.forEach((m) => (m.visible = false))
  //   return () => meshes.forEach((m) => (m.visible = true))
  // }, [cabane])

  // Per-berry state — all refs, no setState in frame loop
  const meshRegistryRef = useRef([])
  const posRefs = useRef([])
  const collectedSlots = useRef([])
  const animScales = useRef([])
  const collectedCountRef = useRef(0)

  useEffect(() => {
    posRefs.current = RASPBERRY_DEFS.map((d) => [...d.position])
    collectedSlots.current = RASPBERRY_DEFS.map(() => null)
    animScales.current = RASPBERRY_DEFS.map((d) => (d.isRipe ? 0.07 : 0.06))
    collectedCountRef.current = 0
  }, [])

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
  const _basketWorldPos = useMemo(
    () =>
      new THREE.Vector3(
        GROUP_WORLD_POS[0] + BASKET_SNAP[0],
        GROUP_WORLD_POS[1] + BASKET_SNAP[1],
        GROUP_WORLD_POS[2] + BASKET_SNAP[2]
      ),
    []
  )

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
      if (
        !isActive ||
        collectedSlots.current[index] !== null ||
        collectedCountRef.current >= RIPE_COUNT
      )
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
      const ny = Math.max(local.y, BASKET_SNAP[1] - 0.1)
      const nz = local.z
      posRefs.current[idx] = [nx, ny, nz]
      meshRegistryRef.current[idx]?.position.set(nx, ny, nz)
    }

    const onPointerUp = (e) => {
      const idx = draggedIndexRef.current
      if (idx === null) return
      draggedIndexRef.current = null
      document.body.style.cursor = 'auto'
      toNDC(e)

      const basketNdc = _basketWorldPos.clone().project(camera)
      const dx = pointerNdcRef.current.x - basketNdc.x
      const dy = pointerNdcRef.current.y - basketNdc.y
      const def = RASPBERRY_DEFS[idx]

      if (Math.sqrt(dx * dx + dy * dy) < BASKET_NDC_RADIUS) {
        if (!def.isRipe) {
          onUnripeAttempt?.()
          posRefs.current[idx] = [...def.position]
          meshRegistryRef.current[idx]?.position.set(...def.position)
        } else {
          const slot = collectedCountRef.current
          collectedCountRef.current += 1
          collectedSlots.current[idx] = slot
          const count = collectedCountRef.current
          onStateChange?.({ active: true, count, complete: count >= RIPE_COUNT })
        }
      } else {
        posRefs.current[idx] = [...def.position]
        meshRegistryRef.current[idx]?.position.set(...def.position)
      }
    }

    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', onPointerUp)
    return () => {
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
      document.body.style.cursor = 'auto'
    }
  }, [
    isActive,
    camera,
    gl,
    toNDC,
    raycaster,
    onStateChange,
    onUnripeAttempt,
    _basketWorldPos,
    _hit,
  ])

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

    for (let i = 0; i < RASPBERRY_DEFS.length; i++) {
      const slot = collectedSlots.current[i]
      if (slot === null) continue
      const mesh = meshRegistryRef.current[i]
      if (!mesh) continue

      const s = BASKET_SLOTS[slot]
      const tx = BASKET_SNAP[0] + s[0]
      const ty = BASKET_SNAP[1] + s[1]
      const tz = BASKET_SNAP[2] + s[2]
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
    <group ref={groupRef} position={GROUP_WORLD_POS}>
      <Basket />
      {RASPBERRY_DEFS.map((def, i) => (
        <RaspberryInstance
          key={i}
          definition={def}
          onMeshRef={handleMeshRef(i)}
          onPointerDown={(e) => handleBerryPointerDown(i, e)}
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
