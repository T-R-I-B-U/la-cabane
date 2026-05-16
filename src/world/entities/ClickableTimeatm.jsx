import * as THREE from 'three'
import { useCenterScreenMeshInteraction } from '../interactions/useCenterScreenMeshInteraction'

const HOVER_EMISSIVE = new THREE.Color(0xffefbf)
const HOVER_EMISSIVE_INTENSITY = 0.35
const TIMEATM_NAME = 'timeatm'

function findTimeatmMeshes(cabaneGroup) {
  if (!cabaneGroup) return []
  const node = cabaneGroup.getObjectByName(TIMEATM_NAME)
  if (!node) return []
  if (node.isMesh) return [node]
  const meshes = []
  node.traverse((object) => {
    if (object.isMesh) meshes.push(object)
  })
  return meshes
}

export function ClickableTimeatm({ cabane, isInteractable, onInteract }) {
  useCenterScreenMeshInteraction({
    cabaneGroup: cabane,
    isInteractable,
    findMeshes: findTimeatmMeshes,
    hoverEmissive: HOVER_EMISSIVE,
    hoverEmissiveIntensity: HOVER_EMISSIVE_INTENSITY,
    onInteract,
  })

  return null
}
