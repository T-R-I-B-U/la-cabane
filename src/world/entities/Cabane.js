import * as THREE from 'three'
import { buildNode } from '../cabane/nodeBuilder'
import { findNodePosition } from '../cabane/runtime'
export { clearTextureCache } from '../cabane/textureResolver'

/**
 * Build the full scene graph from cabane.json.
 * Returns a THREE.Group ready to be added to the scene (or used with <primitive>).
 *
 * Missing models become empty pivots — the hierarchy still places correctly.
 */
export async function buildCabane({
  basePath = '/models/',
  jsonPath = '/cabane.json',
  jsonData = null,
} = {}) {
  let data = jsonData
  if (!data) {
    const res = await fetch(jsonPath)
    if (!res.ok) throw new Error(`Cannot load ${jsonPath} (${res.status})`)
    data = await res.json()
  }

  const root = new THREE.Group()
  root.name = 'cabane'

  const nodes = Array.isArray(data) ? data : [data]
  root.userData.hutPosition = findNodePosition(nodes, 'hut01')
  const built = await Promise.all(nodes.map((node) => buildNode(node, basePath)))
  for (const obj of built) {
    if (obj) root.add(obj)
  }

  root.traverse((obj) => {
    if (!obj.isMesh) return
    // Stair steps — walkable ramps instead of vertical walls.
    if (/^stairs-marche/i.test(obj.name)) obj.userData.isStair = true
    // Platform walkable surface — floor raycaster must recognise it.
    if (obj.name === 'platform') obj.userData.isFloor = true
  })

  return root
}
