import { useMemo, useRef, useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { disposeObject3D } from '../../core/disposeObject3D'
import { fruitHoverStore } from '../../utils/fruitHoverStore'
import {
  createOutlineGeometry,
  createOutlineMaterial,
  useOutlineResolution,
} from '../materials/outlineEffect'
import { applyAutoTextures } from '../cabane/textureResolver'

const DEFAULT_POSITION = [-25.5, 25.5, -9]
const _centerNdc = new THREE.Vector2(0, 0)
const _raycaster = new THREE.Raycaster()

export function Fruit({
  fruitId,
  position = DEFAULT_POSITION,
  active = true,
  onFruitClick,
  onFruitHover,
}) {
  const { scene } = useGLTF('/models/growingfruit.gltf')
  const { gl } = useThree()
  const rootRef = useRef()
  const meshRef = useRef(null)
  const proxyRef = useRef(null)
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

    const box = new THREE.Box3().setFromObject(c)
    c.position.y = -box.max.y

    return { root: c, mesh: bodyMesh }
  }, [scene])

  useEffect(() => {
    meshRef.current = cloned.mesh
    return () => {
      disposeObject3D(cloned.root)
      fruitHoverStore.setHovered(fruitId, false)
    }
  }, [cloned, fruitId])

  const edgesGeometry = useMemo(() => {
    if (!cloned.mesh) return null
    return createOutlineGeometry(cloned.mesh.geometry, 5, 3)
  }, [cloned])

  const outlineMaterial = useMemo(() => createOutlineMaterial(), [])
  useOutlineResolution(gl, outlineMaterial)

  const _pos = useMemo(() => new THREE.Vector3(), [])
  const _quat = useMemo(() => new THREE.Quaternion(), [])
  const _scl = useMemo(() => new THREE.Vector3(), [])

  const activeRef = useRef(active)
  const onFruitClickRef = useRef(onFruitClick)
  useEffect(() => { activeRef.current = active }, [active])
  useEffect(() => { onFruitClickRef.current = onFruitClick }, [onFruitClick])

  useEffect(() => {
    const onMouseDown = () => {
      if (!hoveredRef.current || !activeRef.current || fruitHoverStore.onCooldown) return
      onFruitClickRef.current?.(fruitId)
    }
    window.addEventListener('mousedown', onMouseDown)
    return () => window.removeEventListener('mousedown', onMouseDown)
  }, [fruitId])

  useFrame(({ camera }) => {
    if (proxyRef.current?.visible && meshRef.current) {
      meshRef.current.matrixWorld.decompose(_pos, _quat, _scl)
      proxyRef.current.matrix.compose(_pos, _quat, _scl)
      proxyRef.current.matrixWorldNeedsUpdate = true
    }

    if (!active || !document.pointerLockElement || !rootRef.current) {
      if (hoveredRef.current) {
        hoveredRef.current = false
        fruitHoverStore.setHovered(fruitId, false)
        if (proxyRef.current) proxyRef.current.visible = false
        onFruitHover?.(false, fruitId)
      }
      return
    }

    _raycaster.setFromCamera(_centerNdc, camera)
    const hit = _raycaster.intersectObject(rootRef.current, true).length > 0
    if (hit !== hoveredRef.current) {
      hoveredRef.current = hit
      fruitHoverStore.setHovered(fruitId, hit)
      if (proxyRef.current) proxyRef.current.visible = hit
      onFruitHover?.(hit, fruitId)
    }
  })

  if (!edgesGeometry) return null

  return (
    <>
      <group position={position} ref={rootRef}>
        <primitive object={cloned.root} />
      </group>

      <lineSegments
        ref={proxyRef}
        geometry={edgesGeometry}
        material={outlineMaterial}
        visible={false}
        matrixAutoUpdate={false}
      />
    </>
  )
}

useGLTF.preload('/models/growingfruit.gltf')
