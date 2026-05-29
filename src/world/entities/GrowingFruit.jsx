import { useMemo, useEffect, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { disposeObject3D } from '../../core/disposeObject3D'
import { fruitHoverStore } from '../../utils/fruitHoverStore'
import { playOnce } from '../../utils/audioStore'
import { applyAutoTextures } from '../cabane/textureResolver'
import {
  createOutlineGeometry,
  createOutlineMaterial,
  useOutlineResolution,
} from '../materials/outlineEffect'

const GROW_DURATION = 3.0 // seconds: scale 0 → 1

function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4)
}

const DEFAULT_POSITION = [-25.5, 25.5, -9]
const _centerNdc = new THREE.Vector2(0, 0)
const _raycaster = new THREE.Raycaster()

export function GrowingFruit({
  position = DEFAULT_POSITION,
  playing = true,
  active = false,
  onComplete,
  onFruitClick,
  onFruitHover,
}) {
  const { scene } = useGLTF('/models/growingfruit.gltf')
  const { gl } = useThree()
  const pivotRef = useRef()
  const rootRef = useRef()
  const meshRef = useRef(null)
  const proxyRef = useRef(null)
  const elapsedRef = useRef(0)
  const completedRef = useRef(false)
  const prevPlayingRef = useRef(playing)
  const hoveredRef = useRef(false)

  const cloned = useMemo(() => {
    const c = scene.clone(true)

    let bodyMesh = null
    let largestVolume = -1
    const _m = new THREE.Matrix4()
    const _bbox = new THREE.Box3()
    const _size = new THREE.Vector3()

    applyAutoTextures(c, 'growingfruit', ['/textures/'])

    c.traverse((obj) => {
      if (!obj.isMesh) return
      _m.identity()
      let node = obj
      while (node !== c && node.parent) {
        _m.premultiply(node.matrix)
        node = node.parent
      }
      obj.geometry.computeBoundingBox()
      _bbox.copy(obj.geometry.boundingBox).applyMatrix4(_m)
      _bbox.getSize(_size)
      const vol = _size.x * _size.y * _size.z
      if (vol > largestVolume) {
        largestVolume = vol
        bodyMesh = obj
      }
    })

    // Shift mesh down so its top sits at y=0 — scale then grows downward from the attachment point
    const box = new THREE.Box3().setFromObject(c)
    c.position.y = -box.max.y

    return { root: c, mesh: bodyMesh }
  }, [scene])

  useEffect(() => {
    meshRef.current = cloned.mesh
    return () => disposeObject3D(cloned.root)
  }, [cloned])

  const edgesGeometry = useMemo(() => {
    if (!cloned.mesh) return null
    return createOutlineGeometry(cloned.mesh.geometry, 5, 3)
  }, [cloned])

  const outlineMaterial = useMemo(() => createOutlineMaterial(), [])
  useOutlineResolution(gl, outlineMaterial)

  const _pos = useMemo(() => new THREE.Vector3(), [])
  const _quat = useMemo(() => new THREE.Quaternion(), [])
  const _scl = useMemo(() => new THREE.Vector3(), [])

  useFrame(({ camera }, delta) => {
    // Track outline proxy to mesh world matrix
    if (proxyRef.current?.visible && meshRef.current) {
      meshRef.current.matrixWorld.decompose(_pos, _quat, _scl)
      proxyRef.current.matrix.compose(_pos, _quat, _scl)
      proxyRef.current.matrixWorldNeedsUpdate = true
    }

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

    // Raycasting hover — only after growth and when active
    if (!active || !document.pointerLockElement || !rootRef.current) {
      if (hoveredRef.current) {
        hoveredRef.current = false
        fruitHoverStore.setHovered('fruit_player', false)
        if (proxyRef.current) proxyRef.current.visible = false
        onFruitHover?.(false)
      }
      return
    }

    _raycaster.setFromCamera(_centerNdc, camera)
    const hit = _raycaster.intersectObject(rootRef.current, true).length > 0
    if (hit !== hoveredRef.current) {
      hoveredRef.current = hit
      fruitHoverStore.setHovered('fruit_player', hit)
      if (proxyRef.current) proxyRef.current.visible = hit
      onFruitHover?.(hit)
    }
  })

  return (
    <>
      <group position={position} ref={rootRef}>
        <group ref={pivotRef}>
          <primitive
            object={cloned.root}
            onPointerDown={(e) => {
              if (!active || fruitHoverStore.onCooldown) return
              e.stopPropagation()
              playOnce('clickMagic')
              onFruitClick?.()
            }}
          />
        </group>
      </group>

      {edgesGeometry && (
        <lineSegments
          ref={proxyRef}
          geometry={edgesGeometry}
          material={outlineMaterial}
          visible={false}
          matrixAutoUpdate={false}
        />
      )}
    </>
  )
}
