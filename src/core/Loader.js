import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const _loader = new GLTFLoader()

// Promise cache — concurrent requests for the same path share one load.
const _cache = new Map()

function cloneSingleMaterial(material) {
  const clone = material.clone()

  for (const [key, value] of Object.entries(clone)) {
    if (value?.isTexture) clone[key] = value.clone()
  }

  return clone
}

function cloneMaterial(material) {
  return Array.isArray(material) ? material.map(cloneSingleMaterial) : cloneSingleMaterial(material)
}

function cloneScene(scene) {
  const clone = scene.clone(true)

  clone.traverse((obj) => {
    if (!obj.isMesh) return
    obj.geometry = obj.geometry.clone()
    obj.material = cloneMaterial(obj.material)
  })

  return clone
}

/**
 * Load a GLB/GLTF and return a cloned scene root.
 * The raw GLTF is parsed once and cached; callers get independent clones.
 */
export async function loadModel(path) {
  if (!_cache.has(path)) {
    const promise = new Promise((resolve, reject) => {
      _loader.load(path, resolve, undefined, reject)
    })
    promise.catch(() => _cache.delete(path))
    _cache.set(path, promise)
  }
  const gltf = await _cache.get(path)
  return cloneScene(gltf.scene)
}

export function clearCache() {
  _cache.clear()
}
