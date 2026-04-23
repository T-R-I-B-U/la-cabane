import * as THREE from 'three'
import { loadModel } from '../../core/Loader.js'

// C4D Cloner names instances like "arbre_01", "arbre_02" — strip the suffix
// so it maps to the actual file on disk ("arbre.glb").
function modelBaseName(name) {
  return name.replace(/_\d+$/, '')
}

function applyTransform(object3d, node) {
  const [px, py, pz] = node.position
  const [rx, ry, rz] = node.rotation
  const [sx, sy, sz] = node.scale
  object3d.position.set(px, py, pz)
  object3d.rotation.set(rx, ry, rz)
  object3d.scale.set(sx, sy, sz)
}

async function buildNode(node, basePath) {
  let object3d

  const baseName = modelBaseName(node.name)
  for (const ext of ['.glb', '.gltf']) {
    try {
      object3d = await loadModel(`${basePath}${baseName}${ext}`)
      object3d.name = node.name
      break
    } catch {
      // No matching asset — try next extension.
    }
  }

  // Fallback to empty pivot so the rest of the hierarchy still places correctly.
  if (!object3d) {
    object3d = new THREE.Group()
    object3d.name = node.name
  }

  object3d.userData.cabaneNode = true

  // Each C4D-exported GLTF has its world position baked into the root node (first child
  // of gltf.scene). Applying cabane.json directly to the wrapper would double-add that
  // offset. Instead we set the wrapper so that: wrapper + node0.local = cabane.json,
  // which places node0 at the correct world position and preserves all children's
  // relative offsets without modification.
  const firstChild = object3d.children[0]
  if (firstChild) {
    const [px, py, pz] = node.position
    const [rx, ry, rz] = node.rotation
    const [sx, sy, sz] = node.scale
    object3d.position.set(
      px - firstChild.position.x,
      py - firstChild.position.y,
      pz - firstChild.position.z
    )
    object3d.rotation.set(rx, ry, rz)
    object3d.scale.set(sx, sy, sz)
  } else {
    applyTransform(object3d, node)
  }

  if (node.children?.length > 0) {
    const children = await Promise.all(node.children.map((child) => buildNode(child, basePath)))
    for (const child of children) {
      if (child) object3d.add(child)
    }
  }

  return object3d
}

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
  const built = await Promise.all(nodes.map((node) => buildNode(node, basePath)))
  for (const obj of built) {
    if (obj) root.add(obj)
  }

  // Tag stair step meshes so the player controller treats them as walkable
  // surfaces instead of horizontal walls.
  root.traverse((obj) => {
    if (obj.isMesh && /^stairs-marche/i.test(obj.name)) {
      obj.userData.isStair = true
    }
  })

  return root
}
