import * as THREE from 'three'
import { normalizeAssetName } from './assetNaming'
import { publicAssetManifest } from 'virtual:public-asset-manifest'

const TEXTURE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp']
const textureFiles = publicAssetManifest.textureFiles
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

function canonicalTextureKey(value = '') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

const MESH_TEXTURE_ALIASES = {
  'platform-details': 'railling',
  'tour fenêtre': 'tour_fenêtre',
  'tour-fenetre': 'tour_fenêtre',
  glass: 'glass',
  'cross-window': 'cross-window',
  'hut-verre': 'hut-verre',
  fenêtre: 'glass',
  fenetre: 'glass',
  'fenêtre.1': 'cross-window',
  'fenetre-1': 'cross-window',
}

const FORCE_TEXTURE_OVERRIDE_MESHES = new Set([
  'tour fenêtre',
  'glass',
  'cross-window',
  'hut-verre',
  'fenêtre',
  'fenêtre.1',
])

const TEXTURE_TRANSFORMS = {
  nest_foot: {
    center: [0.5, 0.5],
    rotation: Math.PI / 2,
  },
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

  if (!availableTextures.has(key)) availableTextures.set(key, [])

  const urls = availableTextures.get(key)
  if (!urls.includes(url)) urls.push(url)
}

function registerAvailableTextures() {
  if (availableTextures.size > 0) return

  for (const path of textureFiles) {
    const fileName = path.split('/').at(-1)
    const ext = TEXTURE_EXTENSIONS.find((entry) => fileName.toLowerCase().endsWith(entry))
    if (!ext) continue

    const key = fileName.slice(0, -ext.length).toLowerCase()
    registerTextureKey(key, path)
    registerTextureKey(key.normalize('NFC'), path)
    registerTextureKey(key.normalize('NFD'), path)
    registerTextureKey(normalizeAssetName(key), path)
    registerTextureKey(canonicalTextureKey(key), path)
  }
}

function findTextureUrl(names, suffix, textureBasePaths) {
  registerAvailableTextures()

  const normalizedBasePaths = textureBasePaths.map((basePath) => basePath.replace(/\/$/, ''))

  for (const name of names) {
    for (const candidate of textureNameCandidates(name)) {
      const key = `${candidate}-${suffix}`.toLowerCase()
      const urls = [
        ...(availableTextures.get(key) ?? []),
        ...(availableTextures.get(key.normalize('NFC')) ?? []),
        ...(availableTextures.get(key.normalize('NFD')) ?? []),
        ...(availableTextures.get(normalizeAssetName(key)) ?? []),
        ...(availableTextures.get(canonicalTextureKey(key)) ?? []),
      ]

      const uniqueUrls = [...new Set(urls)]

      for (const basePath of normalizedBasePaths) {
        const url = uniqueUrls.find((entry) => entry.startsWith(basePath))
        if (url) return url
      }
    }
  }

  return null
}

function loadTexture(url, colorSpace) {
  if (!textureCache.has(url)) {
    const promise = textureLoader.loadAsync(url).then((texture) => {
      texture.flipY = false
      if (colorSpace) texture.colorSpace = colorSpace
      texture.generateMipmaps = false
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
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

function cloneTexture(texture) {
  const clone = texture.clone()
  clone.needsUpdate = true
  return clone
}

function resolveTextureAlias(name) {
  if (!name) return null

  const lowered = name.toLowerCase().trim()
  const normalized = normalizeAssetName(name)
  const trimmedNumericSuffix = lowered.replace(/[._-]\d+$/, '')
  const normalizedTrimmedNumericSuffix = normalizeAssetName(trimmedNumericSuffix)
  const candidates = [
    name,
    name.normalize('NFC'),
    name.normalize('NFD'),
    lowered,
    normalized,
    trimmedNumericSuffix,
    normalizedTrimmedNumericSuffix,
  ]

  for (const candidate of candidates) {
    if (candidate && MESH_TEXTURE_ALIASES[candidate]) return MESH_TEXTURE_ALIASES[candidate]
  }

  return null
}

function resetMaterialTint(material) {
  if (!material?.color) return
  material.color.set(0xffffff)
}

function applyTextureTransform(texture, textureNames) {
  const transformName = textureNames.find((name) => TEXTURE_TRANSFORMS[name])
  if (!transformName) return

  const transform = TEXTURE_TRANSFORMS[transformName]
  if (transform.center) texture.center.set(transform.center[0], transform.center[1])
  if (typeof transform.rotation === 'number') texture.rotation = transform.rotation
}

function getTextureNames(object3d, obj, fallbackName) {
  const directAlias = resolveTextureAlias(obj.name)
  const ancestorAlias = !directAlias
    ? (() => {
        let current = obj.parent
        while (current && current !== object3d) {
          const alias = resolveTextureAlias(current.name)
          if (alias) return alias
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

export async function applyAutoTextures(object3d, fallbackName, textureBasePaths = ['/textures/']) {
  const tasks = []

  object3d.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return

    const forcedAlias = resolveTextureAlias(obj.name)
    const textureNames = forcedAlias ? [forcedAlias] : getTextureNames(object3d, obj, fallbackName)
    forEachMaterial(obj.material, (material) => {
      material.side = THREE.DoubleSide
      tasks.push(
        Promise.all(
          TEXTURE_SLOTS.map(async ({ suffix, materialKey, colorSpace }) => {
            if (material[materialKey] && !FORCE_TEXTURE_OVERRIDE_MESHES.has(obj.name)) return

            const url = findTextureUrl(textureNames, suffix, textureBasePaths)
            if (!url) return

            const sourceTexture = await loadTexture(url, colorSpace)
            const texture = cloneTexture(sourceTexture)
            applyTextureTransform(texture, textureNames)
            material[materialKey] = texture
            resetMaterialTint(material)
            material.needsUpdate = true
          })
        )
      )
    })
  })

  await Promise.all(tasks)
}

export function clearTextureCache() {
  for (const texturePromise of textureCache.values()) {
    texturePromise.then((texture) => texture.dispose())
  }

  textureCache.clear()
}
