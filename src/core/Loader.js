import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const _loader = new GLTFLoader()

// Promise cache — concurrent requests for the same path share one load.
const _cache = new Map()

const _texLoader = new THREE.TextureLoader()
const _texCache = new Map()

function tryLoadTexture(path) {
  if (_texCache.has(path)) return _texCache.get(path)
  const promise = new Promise((resolve) => {
    _texLoader.load(path, resolve, undefined, () => resolve(null))
  })
  _texCache.set(path, promise)
  return promise
}

/**
 * Apply optional PBR textures ({baseName}-color, -metallic, -roughness) onto a model.
 * Only found textures are applied; missing ones are left untouched.
 */
export async function applyModelTextures(object3d, baseName, texturePath = '/textures/') {
  const EXTS = ['.png', '.jpg', '.webp']

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

  if (!colorMap && !metallicMap && !roughnessMap) return

  if (colorMap) {
    colorMap.colorSpace = THREE.SRGBColorSpace
    colorMap.flipY = false
  }
  if (metallicMap) {
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
    const mat =
      src?.isMeshStandardMaterial || src?.isMeshPhysicalMaterial
        ? src.clone()
        : new THREE.MeshStandardMaterial({ color: 0xffffff })

    if (colorMap) mat.map = colorMap
    if (metallicMap) {
      mat.metalnessMap = metallicMap
      mat.metalness = 1
    }
    if (roughnessMap) {
      mat.roughnessMap = roughnessMap
      mat.roughness = 1
    }
    mat.needsUpdate = true

    if (Array.isArray(node.material)) {
      node.material = node.material.map(() => mat)
    } else {
      node.material = mat
    }
  })
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
  return gltf.scene.clone(true)
}

export function clearCache() {
  _cache.clear()
}
