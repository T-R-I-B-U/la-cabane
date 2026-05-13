import * as THREE from 'three'
import { useCenterScreenMeshInteraction } from '../interactions/useCenterScreenMeshInteraction'

const HOVER_EMISSIVE = new THREE.Color(0xffefbf)
const HOVER_EMISSIVE_INTENSITY = 0.35
const WORKBENCH_NAME = 'workbench01'

// Three workbench01 meshes exist in the scene: two in the serre (~x -29) and one
// in the cabane atelier (~x -71). We target only the cabane one by world position.
function findWorkbenchMeshes(cabaneGroup) {
  if (!cabaneGroup) return []
  const meshes = []
  cabaneGroup.traverse((object) => {
    if (object.name === WORKBENCH_NAME && object.isMesh) {
      const worldPos = object.getWorldPosition(new THREE.Vector3())
      if (worldPos.x < -60) meshes.push(object)
    }
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
