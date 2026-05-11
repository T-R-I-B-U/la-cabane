import * as THREE from 'three'
import { useCenterScreenMeshInteraction } from '../interactions/useCenterScreenMeshInteraction'

const HOVER_EMISSIVE = new THREE.Color(0xffefbf)
const HOVER_EMISSIVE_INTENSITY = 0.35

function findJuiceMachineMeshes(cabaneGroup) {
  if (!cabaneGroup) return []
  const parent = cabaneGroup.getObjectByName('juicemachine')
  if (!parent) return []
  const meshes = []
  parent.traverse((child) => {
    if (child.isMesh) meshes.push(child)
  })
  return meshes
}

export function ClickableJuiceMachine({ cabane, isInteractable, onInteract }) {
  useCenterScreenMeshInteraction({
    cabaneGroup: cabane,
    isInteractable,
    findMeshes: findJuiceMachineMeshes,
    hoverEmissive: HOVER_EMISSIVE,
    hoverEmissiveIntensity: HOVER_EMISSIVE_INTENSITY,
    onInteract,
  })

  return null
}
