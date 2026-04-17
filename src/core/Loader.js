import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// Shared loader instance — GLTFLoader is stateless so one is enough.
const _loader = new GLTFLoader()

// In-memory cache: model path → Promise<GLTF>
// Storing the Promise (not the resolved value) means concurrent requests for
// the same path share one network/parse operation and never duplicate work.
const _cache = new Map()

// ── Texture loading ─────────────────────────────────────────────────────────

const _texLoader = new THREE.TextureLoader()
// Cache texture promises (null = confirmed missing, avoids re-fetching 404s).
const _texCache  = new Map()

/**
 * Try to load a texture at `path`. Returns the texture on success, null if
 * the file doesn't exist (404) or fails to decode.
 *
 * @param {string} path
 * @returns {Promise<THREE.Texture|null>}
 */
function tryLoadTexture(path) {
  if (_texCache.has(path)) return _texCache.get(path)

  const promise = new Promise((resolve) => {
    _texLoader.load(path, resolve, undefined, () => resolve(null))
  })
  _texCache.set(path, promise)
  return promise
}

/**
 * For a given model base name, look for optional PBR textures in `texturePath`:
 *   {baseName}-color.{ext}      → material.map          (albedo, sRGB)
 *   {baseName}-metallic.{ext}   → material.metalnessMap
 *   {baseName}-roughness.{ext}  → material.roughnessMap
 *
 * Extensions tried in order: .png, .jpg, .webp
 * Only the maps that are found are applied; missing ones are left untouched.
 * Each mesh's material is cloned before modification so shared cached
 * materials are never mutated.
 *
 * @param {THREE.Object3D} object3d    The loaded model root
 * @param {string}         baseName    Model name without extension (e.g. 'arbre')
 * @param {string}        [texturePath='/textures/']
 * @returns {Promise<void>}
 */
export async function applyModelTextures(object3d, baseName, texturePath = '/textures/') {
  const EXTS = ['.png', '.jpg', '.webp']

  // Return the first texture found across extensions, or null.
  async function findTex(suffix) {
    for (const ext of EXTS) {
      const tex = await tryLoadTexture(`${texturePath}${baseName}-${suffix}${ext}`)
      if (tex) return tex
    }
    return null
  }

  const [colorMap, metallicMap, roughnessMap] = await Promise.all([
    findTex('color'),
    findTex('metallic'),
    findTex('roughness'),
  ])

  // Nothing to apply — bail early without touching the scene graph.
  if (!colorMap && !metallicMap && !roughnessMap) return

  // flipY must be false for GLTF — the spec uses a top-left UV origin.
  if (colorMap) {
    colorMap.colorSpace = THREE.SRGBColorSpace
    colorMap.flipY = false
  }
  if (metallicMap) {
    // Metalness/roughness are linear data, not color — NoColorSpace avoids gamma decode.
    metallicMap.colorSpace = THREE.NoColorSpace
    metallicMap.flipY = false
  }
  if (roughnessMap) {
    roughnessMap.colorSpace = THREE.NoColorSpace
    roughnessMap.flipY = false
  }

  object3d.traverse((node) => {
    if (!node.isMesh) return

    const src = Array.isArray(node.material) ? node.material[0] : node.material

    // Only patch Standard/Physical materials — other types don't support PBR maps.
    const mat = src?.isMeshStandardMaterial || src?.isMeshPhysicalMaterial
      ? src.clone()
      : new THREE.MeshStandardMaterial({ color: 0xffffff })

    if (colorMap)    { mat.map           = colorMap    }
    if (metallicMap) { mat.metalnessMap  = metallicMap; mat.metalness = 1 }
    if (roughnessMap){ mat.roughnessMap  = roughnessMap; mat.roughness = 1 }

    mat.needsUpdate = true

    if (Array.isArray(node.material)) {
      node.material = node.material.map(() => mat)
    } else {
      node.material = mat
    }
  })
}

/**
 * Load a GLTF/GLB file and return a cloned scene ready to add to Three.js.
 *
 * The underlying GLTF is parsed only once per path; subsequent calls receive
 * a deep clone so each placement in the world has its own transform and can
 * be disposed independently without affecting the cached original.
 *
 * @param {string} path  Public path to the .glb / .gltf file (e.g. '/models/tree.glb')
 * @returns {Promise<THREE.Group>}  Cloned scene root
 */
export async function loadModel(path) {
  if (!_cache.has(path)) {
    const promise = new Promise((resolve, reject) => {
      _loader.load(path, resolve, undefined, reject)
    })
    // Remove failed entries so a retry (e.g. different extension) can proceed.
    promise.catch(() => _cache.delete(path))
    _cache.set(path, promise)
  }

  const gltf = await _cache.get(path)

  // SkeletonUtils.clone would be needed for skinned meshes, but our C4D
  // exports are static geometry, so a regular clone is sufficient.
  return gltf.scene.clone(true)
}

/**
 * Clear the entire cache (useful between scene reloads / hot-reload in dev).
 */
export function clearCache() {
  _cache.clear()
}
