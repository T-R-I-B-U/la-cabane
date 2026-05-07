import * as THREE from 'three'
import { useCenterScreenMeshInteraction } from '../interactions/useCenterScreenMeshInteraction'

const HOVER_EMISSIVE = new THREE.Color(0xffefbf)
const HOVER_EMISSIVE_INTENSITY = 0.35
const TRUNK_PARENT = 'trunk'

function findTrunkMeshes(cabaneGroup) {
  if (!cabaneGroup) return []

  const parent = cabaneGroup.getObjectByName(TRUNK_PARENT)
  if (!parent) return []

  const meshes = []
  parent.traverse((object) => {
    if (object.isMesh) meshes.push(object)
  })

  return meshes
}

export function ClickableTree({ cabane, isInteractable, onInteract }) {
  useCenterScreenMeshInteraction({
    cabaneGroup: cabane,
    isInteractable,
    findMeshes: findTrunkMeshes,
    hoverEmissive: HOVER_EMISSIVE,
    hoverEmissiveIntensity: HOVER_EMISSIVE_INTENSITY,
    onInteract,
  })

  return null
}
