import * as THREE from 'three'
import { loadModel, applyModelTextures } from '../../core/Loader.js'

// cabane.json lives in public/ so it can be replaced freely between C4D
// iterations without touching the source code or triggering a rebuild.
// It is fetched at runtime on every buildCabane() call.

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strip the trailing C4D clone suffix from a node name so it maps to a file.
 *
 * C4D Cloner names instances like "arbre_01", "arbre_02", etc.
 * The base asset on disk is "arbre.glb", so we drop the "_\d+" suffix.
 *
 * Examples:
 *   "arbre_01"  → "arbre"
 *   "rembarde"  → "rembarde"   (no suffix → unchanged)
 *
 * @param {string} name
 * @returns {string}
 */
function modelBaseName(name) {
  return name.replace(/_\d+$/, '')
}

/**
 * Apply the position / rotation / scale from a hierarchy node onto a
 * Three.js Object3D.  Rotation values are Euler angles in radians (XYZ order),
 * matching how Three.js stores them and how Mapper exports them.
 *
 * @param {THREE.Object3D} object3d
 * @param {{ position: number[], rotation: number[], scale: number[] }} node
 */
function applyTransform(object3d, node) {
  const [px, py, pz] = node.position
  const [rx, ry, rz] = node.rotation
  const [sx, sy, sz] = node.scale

  object3d.position.set(px, py, pz)
  object3d.rotation.set(rx, ry, rz)   // Euler XYZ
  object3d.scale.set(sx, sy, sz)
}

// ---------------------------------------------------------------------------
// Core recursive builder
// ---------------------------------------------------------------------------

/**
 * Recursively build a Three.js subtree from a hierarchy node.
 *
 * For every named node, attempt to load a matching .glb then .gltf from
 * public/models/.  If neither exists the node becomes an empty THREE.Group
 * (a positional pivot) so the rest of the hierarchy still places correctly.
 * The type field is ignored for loading purposes — C4D regularly exports
 * geometry containers as "Object3D" rather than "Mesh".
 *
 * @param {{ name: string, type: string, position: number[], rotation: number[],
 *           scale: number[], children: object[] }} node
 * @param {string} basePath  Public path prefix, e.g. '/models/'
 * @returns {Promise<THREE.Object3D>}
 */
async function buildNode(node, basePath, texturePath) {
  let object3d

  // Try .glb first, then .gltf — C4D exports can use either extension.
  const baseName = modelBaseName(node.name)
  for (const ext of ['.glb', '.gltf']) {
    try {
      object3d = await loadModel(`${basePath}${baseName}${ext}`)
      object3d.name = node.name
      await applyModelTextures(object3d, baseName, texturePath)
      break
    } catch {
      // Try next extension.
    }
  }

  // No matching asset found — use an empty pivot so transforms still propagate.
  if (!object3d) {
    object3d = new THREE.Group()
    object3d.name = node.name
  }

  // Mark as a cabane.json node so debug markers ignore internal GLTF sub-nodes.
  object3d.userData.cabaneNode = true

  applyTransform(object3d, node)

  // Recurse into children in parallel — order within the group doesn't matter.
  if (node.children?.length > 0) {
    const childObjects = await Promise.all(
      node.children.map((child) => buildNode(child, basePath, texturePath)),
    )
    for (const child of childObjects) {
      if (child) object3d.add(child)
    }
  }

  return object3d
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build the full Cabane scene graph from the bundled cabane.json manifest.
 *
 * All .glb assets are loaded in parallel (thanks to the Loader cache) so the
 * total wait time is bounded by the heaviest single asset, not the sum.
 *
 * @param {object} [options]
 * @param {string} [options.basePath='/models/']  Public folder containing the .glb files
 * @returns {Promise<THREE.Group>}  Root group — add this directly to the scene
 */
export async function buildCabane({
  basePath    = '/models/',
  texturePath = '/textures/',
  jsonPath    = '/cabane.json',
  jsonData    = null,
} = {}) {
  let cabaneData
  if (jsonData) {
    cabaneData = jsonData
  } else {
    const res = await fetch(jsonPath)
    if (!res.ok) throw new Error(`Impossible de charger ${jsonPath} (${res.status})`)
    cabaneData = await res.json()
  }

  const root = new THREE.Group()
  root.name = 'cabane'

  // Accept both a flat array of nodes and a single root node object.
  const nodes = Array.isArray(cabaneData) ? cabaneData : [cabaneData]

  const built = await Promise.all(nodes.map((node) => buildNode(node, basePath, texturePath)))
  for (const obj of built) {
    if (obj) root.add(obj)
  }

  return root
}
