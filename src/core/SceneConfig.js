import * as THREE from 'three'

// Top face of the hut's base ring — measured from hut01.gltf vertex data.
export const FLOOR_Y = 0.04

// Fallback used before cabane.json has loaded.
export const DEFAULT_HUT_POS = [-5.0111, 2.3616, 0.9556]

export const PLAYER_HEIGHT = 1.4

// World position of the platform mesh surface.
// Derived from cabane.json group [-2.3079, 23.1922, 20.3107] + GLTF mesh local offset [+0.06, -0.29, -21.28].
export const PLATFORM_POS = [-2.25, 22.9, -0.97]

export function getPlayerSpawn(hutPosition = DEFAULT_HUT_POS) {
  return new THREE.Vector3(hutPosition[0], FLOOR_Y + PLAYER_HEIGHT, hutPosition[2] + 6)
}

export function getPlatformSpawn() {
  // Spawn slightly above surface — floor raycaster snaps the player down to the mesh.
  return new THREE.Vector3(PLATFORM_POS[0], PLATFORM_POS[1] + PLAYER_HEIGHT + 1, PLATFORM_POS[2])
}
