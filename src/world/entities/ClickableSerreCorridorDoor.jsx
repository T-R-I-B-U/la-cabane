import * as THREE from 'three'
import { useCenterScreenMeshInteraction } from '../interactions/useCenterScreenMeshInteraction'

const HOVER_EMISSIVE = new THREE.Color(0xffefbf)
const HOVER_EMISSIVE_INTENSITY = 0.35
const SERRE_CORRIDOR_DOOR_PARENT = 'door03'

function findSerreCorridorDoorMeshes(cabaneGroup) {
  if (!cabaneGroup) return []
  const parent = cabaneGroup.getObjectByName(SERRE_CORRIDOR_DOOR_PARENT)
  if (!parent) return []
  const meshes = []
  parent.traverse((object) => {
    if (object.isMesh) meshes.push(object)
  })
  return meshes
}

export function ClickableSerreCorridorDoor({ cabane, isInteractable, onDoorClick }) {
  useCenterScreenMeshInteraction({
    cabaneGroup: cabane,
    isInteractable,
    findMeshes: findSerreCorridorDoorMeshes,
    hoverEmissive: HOVER_EMISSIVE,
    hoverEmissiveIntensity: HOVER_EMISSIVE_INTENSITY,
    onInteract: onDoorClick,
  })

  return null
}
