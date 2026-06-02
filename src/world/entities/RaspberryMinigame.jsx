import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { cursorStore } from '../../utils/cursorStore'
import { playOnce } from '../../utils/audioStore'

// ── Constants ─────────────────────────────────────────────────────────────────

// Static basket from cabane.json at world [-32.9799, 0.3203, -42.6757] scale [1,1,1].
// basket.gltf bbox y_max = 0.239 → top opening at world y = 0.3203 + 0.239 = 0.5593.
// BASKET_SNAP expressed in GROUP_WORLD_POS-local space.
// local = world_basket_top - GROUP_WORLD_POS = [-32.98-(-38.5), 0.56-0.44, -42.68-(-42.4)]
const BASKET_ORIGIN = [-32.9799, 0.3203, -42.6757]
const BASKET_SNAP = [5.52, 0.12, -0.28]
const BASKET_NDC_RADIUS = 0.15

// Berry slots: offsets inside the basket relative to BASKET_SNAP.
// Basket interior ≈ ±0.2m in x/z at scale 1; berries sit slightly below the opening.
const BASKET_SLOTS = [
  [0.0, -0.12, 0.0],
  [0.1, -0.09, 0.09],
  [-0.1, -0.09, 0.09],
  [0.1, -0.09, -0.09],
  [-0.1, -0.09, -0.09],
]
const BASKET_SCALE_IN = 0.9
const RIPE_COUNT = 5

// Same hover emissive as ladder/tree/workbench (useCenterScreenMeshInteraction).
const HOVER_EMISSIVE = 0xffefbf
const HOVER_EMISSIVE_INTENSITY = 0.35

function setBerryEmissive(root, on) {
  root?.traverse((c) => {
    if (!c.isMesh || !c.material?.emissive) return
    c.material.emissive.setHex(on ? HOVER_EMISSIVE : 0x000000)
    c.material.emissiveIntensity = on ? HOVER_EMISSIVE_INTENSITY : 0
  })
}

// World anchor on the outsideplant03 row nearest the basket (cabane.json).
// Row at z≈-42.7: plants at x=-38.53, -39.26, -40.13 / y≈0.44.
const GROUP_WORLD_POS = [-35.5, 1.0, -41.0]

// Berry positions derived from outsideplant03.gltf vertex clusters, rotation-corrected.
// Each plant's euler rotation (from cabane.json) was applied to model-local cluster centers.
// World y ≈ 0.95–1.18 = visual top of the raspberry plants.
const RASPBERRY_DEFS = [
  // Plant 1 (world x≈-38.53) rot=(-1.537,-1.262,-1.807)
  { position: [0.605, 0.52, 0.93], rotation: [0.2, 0.8, 0.3], isRipe: true },
  { position: [0.627, 0.312, 0.78], rotation: [-0.3, 2.1, 0.1], isRipe: false },
  // Plant 2 (world x≈-39.26) rot=(-1.604, 1.262, 1.335)
  { position: [0.536, 0.578, 0.423], rotation: [0.1, 3.8, -0.2], isRipe: true },
  { position: [0.391, 0.388, 0.357], rotation: [-0.2, 1.5, 0.4], isRipe: true },
  // Plant 3 (world x≈-40.13) rot=(-1.537,-1.262,-1.807)
  { position: [1.004, 0.567, 0.435], rotation: [-0.1, 0.4, 0.5], isRipe: true },
  { position: [0.931, 0.342, 0.374], rotation: [0.3, 2.7, -0.3], isRipe: true },
  { position: [0.973, 0.265, 0.333], rotation: [-0.4, 5.1, 0.2], isRipe: false },
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
  const { scene } = useGLTF('/models/basket.gltf')
  const cloned = useMemo(() => scene.clone(true), [scene])
  return <primitive object={cloned} position={position} scale={0.75} />
}

// ── Berry — uses R3F onPointerDown for reliable hit detection ─────────────────
function RaspberryInstance({ definition, onMeshRef }) {
  const { scene } = useGLTF('/models/raspberry.gltf')
  const colorMapRaw = useTexture('/textures/raspberry-color.png')
  const roughnessMap = useTexture('/textures/raspberry-roughness.png')
  const metalnessMap = useTexture('/textures/raspberry-metallic.png')

  const baseScale = 1.0

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
        emissive: new THREE.Color(0, 0, 0),
        emissiveIntensity: 0,
      })
    }
    return new THREE.MeshStandardMaterial({
      color: '#9ab84a',
      roughnessMap,
      metalnessMap,
      roughness: 0.85,
      metalness: 0.05,
      emissive: new THREE.Color(0, 0, 0),
      emissiveIntensity: 0,
    })
  }, [definition.isRipe, colorMapRaw, roughnessMap, metalnessMap])

  const cloned = useMemo(() => {
    const c = scene.clone(true)
    c.traverse((child) => {
      if (child.isMesh) child.material = material
    })
    return c
  }, [scene, material])

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
      rotation={definition.rotation}
      scale={baseScale}
    />
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function RaspberryMinigame({ isActive, onStateChange, onUnripeAttempt }) {
  const { camera, gl, scene } = useThree()
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
    animScales.current = RASPBERRY_DEFS.map(() => 2.0)
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

  // Basket position — resolved once from the scene's basket mesh (cabane model)
  const basketMeshRef = useRef(null)
  const _basketWorldPos = useRef(new THREE.Vector3())
  const _basketLocalPos = useRef(new THREE.Vector3(...BASKET_SNAP))

  useEffect(() => {
    if (!isActive) return
    cursorStore.setType('default')
    return () => {
      cursorStore.setType('default')
    }
  }, [isActive])

  const toNDC = useCallback(
    (e) => {
      const rect = gl.domElement.getBoundingClientRect()
      const cx = document.pointerLockElement ? cursorStore.x : e.clientX
      const cy = document.pointerLockElement ? cursorStore.y : e.clientY
      pointerNdcRef.current.x = ((cx - rect.left) / rect.width) * 2 - 1
      pointerNdcRef.current.y = -((cy - rect.top) / rect.height) * 2 + 1
      return pointerNdcRef.current
    },
    [gl]
  )

  // document-level move/up for drag tracking
  useEffect(() => {
    const onPointerDown = (e) => {
      if (!isActive || collectedCountRef.current >= RIPE_COUNT) return
      toNDC(e)
      raycaster.setFromCamera(pointerNdcRef.current, camera)
      const pickable = meshRegistryRef.current.filter(
        (m, i) => m && collectedSlots.current[i] === null
      )
      if (!pickable.length) return
      const hits = raycaster.intersectObjects(pickable, true)
      if (!hits.length) return
      const hitObject = hits[0].object
      let idx = -1
      for (let i = 0; i < meshRegistryRef.current.length; i++) {
        const root = meshRegistryRef.current[i]
        if (!root) continue
        root.traverse((child) => {
          if (child === hitObject) idx = i
        })
        if (idx !== -1) break
      }
      if (idx === -1 || collectedSlots.current[idx] !== null) return
      const camDir = new THREE.Vector3()
      camera.getWorldDirection(camDir)
      camDir.y = 0
      camDir.normalize()
      dragPlane.current.setFromNormalAndCoplanarPoint(camDir.negate(), hits[0].point)
      draggedIndexRef.current = idx
      playOnce('clickMagic')
      cursorStore.setType('grabbing')
    }

    const onPointerMove = (e) => {
      toNDC(e)
      const idx = draggedIndexRef.current
      if (idx === null || !groupRef.current) return

      raycaster.setFromCamera(pointerNdcRef.current, camera)
      if (!raycaster.ray.intersectPlane(dragPlane.current, _hit)) return

      const local = groupRef.current.worldToLocal(_hit.clone())
      const nx = local.x
      const ny = local.y
      const nz = local.z
      posRefs.current[idx] = [nx, ny, nz]
      meshRegistryRef.current[idx]?.position.set(nx, ny, nz)
    }

    const onPointerUp = () => {
      const idx = draggedIndexRef.current
      if (idx === null) return
      draggedIndexRef.current = null
      cursorStore.setType('default')

      const berryWorldPos = groupRef.current
        ? groupRef.current.localToWorld(new THREE.Vector3(...posRefs.current[idx]))
        : new THREE.Vector3(...posRefs.current[idx])
      const dist = berryWorldPos.distanceTo(_basketWorldPos.current)
      const def = RASPBERRY_DEFS[idx]

      if (dist < 1.2) {
        if (!def.isRipe) {
          onUnripeAttempt?.()
          posRefs.current[idx] = [...def.position]
          meshRegistryRef.current[idx]?.position.set(...def.position)
        } else {
          const slot = collectedCountRef.current
          collectedCountRef.current += 1
          collectedSlots.current[idx] = slot
          setBerryEmissive(meshRegistryRef.current[idx], false)
          const count = collectedCountRef.current
          onStateChange?.({ active: true, count, complete: count >= RIPE_COUNT })
        }
      } else {
        posRefs.current[idx] = [...def.position]
        meshRegistryRef.current[idx]?.position.set(...def.position)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', onPointerUp)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
      cursorStore.setType('default')
    }
  }, [isActive, camera, gl, toNDC, raycaster, onStateChange, onUnripeAttempt, _hit])

  useFrame(() => {
    // basket is auto-instanced — position baked into instance matrices, not Group transform
    if (!basketMeshRef.current) {
      let found = null
      scene.traverse((obj) => {
        if (obj.name === 'basket') found = obj
      })
      if (found) {
        const instancedMesh = found.children.find((c) => c.isInstancedMesh)
        if (instancedMesh) {
          const mat = new THREE.Matrix4()
          const pos = new THREE.Vector3()
          const _q = new THREE.Quaternion()
          const _s = new THREE.Vector3()
          let bestY = Infinity
          for (let i = 0; i < instancedMesh.count; i++) {
            instancedMesh.getMatrixAt(i, mat)
            mat.decompose(pos, _q, _s)
            if (pos.y < bestY) {
              bestY = pos.y
              _basketWorldPos.current.copy(pos)
            }
          }
          basketMeshRef.current = found
        }
      }
    }
    if (basketMeshRef.current && groupRef.current) {
      const local = _basketWorldPos.current.clone()
      groupRef.current.worldToLocal(local)
      _basketLocalPos.current.copy(local)
    }

    const idx = draggedIndexRef.current

    if (idx === null && isActive && collectedCountRef.current < RIPE_COUNT) {
      raycaster.setFromCamera(pointerNdcRef.current, camera)
      const pickable = meshRegistryRef.current.filter(
        (m, i) => m && collectedSlots.current[i] === null
      )
      const hits = pickable.length ? raycaster.intersectObjects(pickable, true) : []
      cursorStore.setType(hits.length ? 'grab' : 'default')

      let hoveredIdx = -1
      if (hits.length) {
        const hitObject = hits[0].object
        for (let i = 0; i < meshRegistryRef.current.length; i++) {
          const root = meshRegistryRef.current[i]
          if (!root) continue
          root.traverse((child) => {
            if (child === hitObject) hoveredIdx = i
          })
          if (hoveredIdx !== -1) break
        }
      }
      for (let i = 0; i < meshRegistryRef.current.length; i++) {
        if (collectedSlots.current[i] !== null) continue
        setBerryEmissive(meshRegistryRef.current[i], i === hoveredIdx)
      }
    }

    for (let i = 0; i < RASPBERRY_DEFS.length; i++) {
      const slot = collectedSlots.current[i]
      if (slot === null) continue
      const mesh = meshRegistryRef.current[i]
      if (!mesh) continue

      const s = BASKET_SLOTS[slot]
      const tx = _basketLocalPos.current.x + s[0]
      const ty = _basketLocalPos.current.y + s[1]
      const tz = _basketLocalPos.current.z + s[2]
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
    <>
      <group ref={groupRef} position={GROUP_WORLD_POS}>
        {RASPBERRY_DEFS.map((def, i) => (
          <RaspberryInstance key={i} definition={def} onMeshRef={handleMeshRef(i)} />
        ))}
      </group>
    </>
  )
}

useGLTF.preload('/models/basket.gltf')
useGLTF.preload('/models/raspberry.gltf')
useTexture.preload('/textures/raspberry-color.png')
useTexture.preload('/textures/raspberry-roughness.png')
useTexture.preload('/textures/raspberry-metallic.png')
