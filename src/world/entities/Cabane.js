import * as THREE from 'three'
import { loadModel, applyModelTextures } from '../../core/Loader.js'

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

async function buildNode(node, basePath, texturePath) {
  let object3d

  const baseName = modelBaseName(node.name)
  for (const ext of ['.glb', '.gltf']) {
    try {
      object3d = await loadModel(`${basePath}${baseName}${ext}`)
      object3d.name = node.name
      await applyModelTextures(object3d, baseName, texturePath)
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
  applyTransform(object3d, node)

  if (node.children?.length > 0) {
    const children = await Promise.all(
      node.children.map((child) => buildNode(child, basePath, texturePath)),
    )
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
  texturePath = '/textures/',
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
  const built = await Promise.all(nodes.map((node) => buildNode(node, basePath, texturePath)))
  for (const obj of built) {
    if (obj) root.add(obj)
  }

  return root
}
