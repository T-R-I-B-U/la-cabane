import * as THREE from 'three'
import { useCenterScreenMeshInteraction } from '../interactions/useCenterScreenMeshInteraction'

const HOVER_EMISSIVE = new THREE.Color(0xffefbf)
const HOVER_EMISSIVE_INTENSITY = 0.35

function findJuiceGlassMeshes(cabaneGroup) {
  if (!cabaneGroup) return []
  const meshes = []
  cabaneGroup.traverse((object) => {
    if (object.name === 'juiceglass' && object.userData?.cabaneNode) {
      object.traverse((child) => {
        if (child.isMesh) meshes.push(child)
      })
    }
  })
  return meshes
}

export function ClickableJuiceTable({ cabane, isInteractable, onInteract }) {
  useCenterScreenMeshInteraction({
    cabaneGroup: cabane,
    isInteractable,
    findMeshes: findJuiceGlassMeshes,
    hoverEmissive: HOVER_EMISSIVE,
    hoverEmissiveIntensity: HOVER_EMISSIVE_INTENSITY,
    onInteract,
  })

  return null
}
