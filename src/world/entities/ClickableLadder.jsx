import * as THREE from 'three'
import { useCenterScreenMeshInteraction } from '../interactions/useCenterScreenMeshInteraction'

const HOVER_EMISSIVE = new THREE.Color(0xffefbf)
const HOVER_EMISSIVE_INTENSITY = 0.35
const LADDER_NODE = 'ladder'

function findLadderMeshes(cabaneGroup) {
  if (!cabaneGroup) return []
  const ladderNode = cabaneGroup.getObjectByName(LADDER_NODE)
  if (!ladderNode) return []
  const meshes = []
  ladderNode.traverse((obj) => {
    if (obj.isMesh) meshes.push(obj)
  })
  return meshes
}

export function ClickableLadder({ cabane, isInteractable, onInteract }) {
  useCenterScreenMeshInteraction({
    cabaneGroup: cabane,
    isInteractable,
    findMeshes: findLadderMeshes,
    hoverEmissive: HOVER_EMISSIVE,
    hoverEmissiveIntensity: HOVER_EMISSIVE_INTENSITY,
    onInteract,
  })
  return null
}
