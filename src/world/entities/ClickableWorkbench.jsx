import * as THREE from 'three'
import { useCenterScreenMeshInteraction } from '../interactions/useCenterScreenMeshInteraction'

const HOVER_EMISSIVE = new THREE.Color(0xffefbf)
const HOVER_EMISSIVE_INTENSITY = 0.35
const WORKBENCH_NAME = 'workbench01'

function findWorkbenchMeshes(cabaneGroup) {
  if (!cabaneGroup) return []
  const parent = cabaneGroup.getObjectByName(WORKBENCH_NAME)
  if (!parent) return []
  const meshes = []
  parent.traverse((object) => {
    if (object.isMesh) meshes.push(object)
  })
  return meshes
}

export function ClickableWorkbench({ cabane, isInteractable, onInteract }) {
  useCenterScreenMeshInteraction({
    cabaneGroup: cabane,
    isInteractable,
    findMeshes: findWorkbenchMeshes,
    hoverEmissive: HOVER_EMISSIVE,
    hoverEmissiveIntensity: HOVER_EMISSIVE_INTENSITY,
    onInteract,
  })

  return null
}
