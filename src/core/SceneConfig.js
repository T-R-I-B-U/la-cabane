import * as THREE from 'three'

// Top face of the hut's base ring — measured from hut01.gltf vertex data.
export const FLOOR_Y = 0.04

// Fallback used before cabane.json has loaded.
export const DEFAULT_HUT_POS = [-5.0111, 2.3616, 0.9556]

export const PLAYER_HEIGHT = 1.4

export function getPlayerSpawn(hutPosition = DEFAULT_HUT_POS) {
  return new THREE.Vector3(hutPosition[0], FLOOR_Y + PLAYER_HEIGHT, hutPosition[2] + 6)
}
