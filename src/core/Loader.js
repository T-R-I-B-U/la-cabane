import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const _loader = new GLTFLoader()

// Promise cache — concurrent requests for the same path share one load.
const _cache = new Map()

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
  return gltf.scene.clone(true)
}

export function clearCache() {
  _cache.clear()
}
