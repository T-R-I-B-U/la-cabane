import * as THREE from 'three'

// Top face of the hut's base ring — measured from hut01.gltf vertex data.
export const FLOOR_Y = 0.04

// hut01 world position from cabane.json
export const HUT_POS = [-5.0111, 2.3616, 0.9556]

export const PLAYER_HEIGHT = 1.4

export const PLAYER_SPAWN = new THREE.Vector3(HUT_POS[0], FLOOR_Y + PLAYER_HEIGHT, HUT_POS[2] + 6)
