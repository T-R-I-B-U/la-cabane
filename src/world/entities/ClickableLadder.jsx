import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStableInteractionCallback } from '../interactions/useStableInteractionCallback'

const CENTER_NDC = new THREE.Vector2(0, 0)
const CYLINDER_RADIUS = 0.7
const noop = () => {}

function getLadderTransform(cabaneGroup) {
  if (!cabaneGroup) return null
  const ladderObject = cabaneGroup.getObjectByName('ladder')
  if (!ladderObject) return null

  ladderObject.updateWorldMatrix(true, true)
  const box = new THREE.Box3().setFromObject(ladderObject)
  const center = box.getCenter(new THREE.Vector3())
  const height = box.max.y - box.min.y

  return { center, height }
}

export function ClickableLadder({ cabane, isInteractable, onInteract }) {
  const { camera } = useThree()
  const meshRef = useRef()
  const hoveredRef = useRef(false)
  const raycasterRef = useRef(new THREE.Raycaster())
  const onInteractRef = useStableInteractionCallback(onInteract)

  const transform = useMemo(() => getLadderTransform(cabane), [cabane])

  useEffect(() => {
    const onPointerDown = (e) => {
      if (e.button !== 0 || !hoveredRef.current) return
      onInteractRef.current?.()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [onInteractRef])

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) return

    if (!isInteractable) {
      // Disable raycasting so the cylinder doesn't block other pointer events
      if (mesh.raycast !== noop) mesh.raycast = noop
      hoveredRef.current = false
      return
    }

    if (mesh.raycast === noop) mesh.raycast = THREE.Mesh.prototype.raycast.bind(mesh)

    raycasterRef.current.setFromCamera(CENTER_NDC, camera)
    const hits = raycasterRef.current.intersectObject(mesh)
    hoveredRef.current = hits.length > 0
  })

  if (!transform) return null

  const { center, height } = transform

  return (
    <mesh ref={meshRef} position={[center.x, center.y, center.z]}>
      <cylinderGeometry args={[CYLINDER_RADIUS, CYLINDER_RADIUS, height, 8]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}
