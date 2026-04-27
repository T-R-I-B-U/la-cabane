import * as THREE from 'three'
import { normalizeAssetName } from './assetNaming'

const TEXTURE_BASE_PATH = '/textures/'
const TEXTURE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp']
const textureModules = import.meta.glob('/public/textures/*.{png,jpg,jpeg,webp}')
const TEXTURE_SLOTS = [
  { suffix: 'color', materialKey: 'map', colorSpace: THREE.SRGBColorSpace },
  { suffix: 'basecolor', materialKey: 'map', colorSpace: THREE.SRGBColorSpace },
  { suffix: 'albedo', materialKey: 'map', colorSpace: THREE.SRGBColorSpace },
  { suffix: 'metallic', materialKey: 'metalnessMap' },
  { suffix: 'metalness', materialKey: 'metalnessMap' },
  { suffix: 'roughness', materialKey: 'roughnessMap' },
  { suffix: 'normal', materialKey: 'normalMap' },
  { suffix: 'ao', materialKey: 'aoMap' },
  { suffix: 'occlusion', materialKey: 'aoMap' },
  { suffix: 'emissive', materialKey: 'emissiveMap', colorSpace: THREE.SRGBColorSpace },
]
const textureLoader = new THREE.TextureLoader()
const textureCache = new Map()
const availableTextures = new Map()

const MESH_TEXTURE_ALIASES = {
  'platform-details': 'railling',
}

function textureNameCandidates(name) {
  const baseName = name.replace(/[_-]\d+$/, '')
  const trimmed = baseName.toLowerCase().trim()
  const normalized = normalizeAssetName(baseName)
  const preservedHyphen = trimmed.replace(/[^a-z0-9\p{L}]+/gu, '-').replace(/^-|-$/g, '')
  const preservedUnderscore = trimmed.replace(/[^a-z0-9\p{L}]+/gu, '_').replace(/^_|_$/g, '')
  const decomposedUnderscore = preservedUnderscore.normalize('NFD')
  const candidates = [
    normalizeAssetName(name),
    normalized,
    normalized.replaceAll('-', '_'),
    preservedHyphen,
    preservedUnderscore,
    decomposedUnderscore,
  ]

  return [...new Set(candidates.filter(Boolean))]
}

function registerTextureKey(key, url) {
  if (!key) return
  if (!availableTextures.has(key)) availableTextures.set(key, url)
}

function registerAvailableTextures() {
  if (availableTextures.size > 0) return

  for (const path of Object.keys(textureModules)) {
    const fileName = path.split('/').at(-1)
    const ext = TEXTURE_EXTENSIONS.find((entry) => fileName.toLowerCase().endsWith(entry))
    if (!ext) continue

    const resolvedUrl = `${TEXTURE_BASE_PATH}${fileName}`
    const key = fileName.slice(0, -ext.length).toLowerCase()
    registerTextureKey(key, resolvedUrl)
    registerTextureKey(key.normalize('NFC'), resolvedUrl)
    registerTextureKey(key.normalize('NFD'), resolvedUrl)
    registerTextureKey(normalizeAssetName(key), resolvedUrl)
  }
}

function findTextureUrl(names, suffix) {
  registerAvailableTextures()

  for (const name of names) {
    for (const candidate of textureNameCandidates(name)) {
      const key = `${candidate}-${suffix}`.toLowerCase()
      const url =
        availableTextures.get(key) ||
        availableTextures.get(key.normalize('NFC')) ||
        availableTextures.get(key.normalize('NFD')) ||
        availableTextures.get(normalizeAssetName(key))

      if (url) return url
    }
  }

  return null
}

function loadTexture(url, colorSpace) {
  if (!textureCache.has(url)) {
    const promise = textureLoader.loadAsync(url).then((texture) => {
      texture.flipY = false
      if (colorSpace) texture.colorSpace = colorSpace
      return texture
    })
    textureCache.set(url, promise)
  }

  return textureCache.get(url)
}

function forEachMaterial(material, callback) {
  if (Array.isArray(material)) material.forEach(callback)
  else if (material) callback(material)
}

function getTextureNames(object3d, obj, fallbackName) {
  const directAlias = MESH_TEXTURE_ALIASES[obj.name]
  const ancestorAlias = !directAlias
    ? (() => {
        let current = obj.parent
        while (current && current !== object3d) {
          if (MESH_TEXTURE_ALIASES[current.name]) return MESH_TEXTURE_ALIASES[current.name]
          current = current.parent
        }
        return null
      })()
    : null

  const effectiveAlias = directAlias || ancestorAlias
  if (effectiveAlias) {
    return [effectiveAlias, obj.name, fallbackName].filter(
      (name, index, names) => name && names.indexOf(name) === index
    )
  }

  return fallbackName && fallbackName !== obj.name ? [obj.name, fallbackName] : [obj.name]
}

export async function applyAutoTextures(object3d, fallbackName) {
  const tasks = []

  object3d.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return

    const textureNames = getTextureNames(object3d, obj, fallbackName)
    forEachMaterial(obj.material, (material) => {
      material.side = THREE.DoubleSide
      tasks.push(
        Promise.all(
          TEXTURE_SLOTS.map(async ({ suffix, materialKey, colorSpace }) => {
            if (material[materialKey]) return

            const url = findTextureUrl(textureNames, suffix)
            if (!url) return

            material[materialKey] = await loadTexture(url, colorSpace)
            material.needsUpdate = true
          })
        )
      )
    })
  })

  await Promise.all(tasks)
}

export function clearTextureCache() {
  textureCache.clear()
}
