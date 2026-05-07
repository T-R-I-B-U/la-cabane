import * as THREE from 'three'
import { useCenterScreenMeshInteraction } from '../interactions/useCenterScreenMeshInteraction'

const HOVER_EMISSIVE = new THREE.Color(0xffefbf)
const HOVER_EMISSIVE_INTENSITY = 0.35
const RECEPTION_PARENT = 'counter01'

function findReceptionMeshes(cabaneGroup) {
  if (!cabaneGroup) return []

  const parent = cabaneGroup.getObjectByName(RECEPTION_PARENT)
  if (!parent) return []

  const meshes = []
  parent.traverse((object) => {
    if (object.isMesh) meshes.push(object)
  })

  return meshes
}

export function ClickableReception({ cabane, isInteractable, onInteract }) {
  useCenterScreenMeshInteraction({
    cabaneGroup: cabane,
    isInteractable,
    findMeshes: findReceptionMeshes,
    hoverEmissive: HOVER_EMISSIVE,
    hoverEmissiveIntensity: HOVER_EMISSIVE_INTENSITY,
    onInteract,
  })

  return null
}
