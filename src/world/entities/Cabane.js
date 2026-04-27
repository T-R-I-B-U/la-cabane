import * as THREE from 'three'
import { loadModel } from '../../core/Loader.js'
import { disposeObject3D } from '../../core/disposeObject3D.js'

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

// C4D Cloner names instances like "arbre_01", "arbre_02" — strip the suffix
// so it maps to the actual file on disk ("arbre.glb").
function modelBaseName(name) {
  if (/^window0[23]$/i.test(name)) return 'window01'

  return name.replace(/_\d+$/, '')
}

function normalizeAssetName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
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

    // Build the URL directly — import.meta.glob returns /public/…?url which is unusable.
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

async function loadTexture(url, colorSpace) {
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

async function applyAutoTextures(object3d, fallbackName) {
  const tasks = []

  object3d.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return
    const textureNames =
      fallbackName && fallbackName !== obj.name ? [obj.name, fallbackName] : [obj.name]

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

function applyTransform(object3d, node) {
  const [px, py, pz] = node.position
  const [rx, ry, rz] = node.rotation
  const [sx, sy, sz] = node.scale
  object3d.position.set(px, py, pz)
  object3d.rotation.set(rx, ry, rz)
  object3d.scale.set(sx, sy, sz)
}

function warnMissingAsset(message) {
  if (!import.meta.env.DEV) return
  console.warn(`[Cabane] ${message}`)
}

function cloneMaterialWithTextures(material) {
  const clone = material.clone()

  for (const [key, value] of Object.entries(clone)) {
    if (value?.isTexture) clone[key] = value.clone()
  }

  return clone
}

function findNodePosition(nodes, name) {
  for (const node of nodes) {
    if (node.name === name && Array.isArray(node.position)) return node.position

    if (node.children?.length) {
      const position = findNodePosition(node.children, name)
      if (position) return position
    }
  }

  return null
}

// Load a .bin file produced by the mapper's InstancedMesh export.
// Format: [uint32 count][float32 × 16 × count] (column-major 4×4 matrices, little-endian).
// Returns an InstancedMesh, or an empty Group if the file is missing.
async function buildInstancedMesh(node, basePath) {
  const baseName = modelBaseName(node.name)

  // Load the template geometry (.glb or .gltf)
  let template = null
  const templatePaths = []
  for (const ext of ['.glb', '.gltf']) {
    const modelPath = `${basePath}${baseName}${ext}`
    templatePaths.push(modelPath)
    try {
      template = await loadModel(modelPath)
      break
    } catch {
      // try next extension
    }
  }

  if (!template) {
    warnMissingAsset(`No template model found for "${node.name}" (${templatePaths.join(', ')})`)
  }

  // Load instance transforms (.bin alongside the geometry file)
  let count = 0
  let floats = null
  const instancePath = `${basePath}${baseName}.bin`
  try {
    const res = await fetch(instancePath)
    if (res.ok) {
      const buf = await res.arrayBuffer()
      count = new DataView(buf).getUint32(0, true)
      floats = new Float32Array(buf, 4, count * 16)
    } else {
      warnMissingAsset(`No instance matrix file found for "${node.name}" (${instancePath})`)
    }
  } catch (err) {
    // .bin not available yet — fall through to empty fallback
    warnMissingAsset(
      `Cannot load instance matrix file for "${node.name}" (${instancePath}): ${err}`
    )
  }

  // Fallback: no geometry or no instances → empty pivot
  if (!template || count === 0 || !floats) {
    const group = new THREE.Group()
    group.name = node.name
    group.userData.cabaneNode = true
    applyTransform(group, node)
    return group
  }

  // Extract first mesh geometry + material from the template
  let geometry = null
  let material = null
  template.traverse((child) => {
    if (!geometry && child.isMesh) {
      geometry = child.geometry.clone()
      material = cloneMaterialWithTextures(child.material)
      material.side = THREE.DoubleSide
    }
  })

  if (!geometry) {
    warnMissingAsset(`Template model for "${node.name}" does not contain a mesh`)
    disposeObject3D(template)
    const group = new THREE.Group()
    group.name = node.name
    group.userData.cabaneNode = true
    applyTransform(group, node)
    return group
  }

  const mesh = new THREE.InstancedMesh(geometry, material, count)
  mesh.name = node.name
  mesh.userData.cabaneNode = true
  applyTransform(mesh, node)
  mesh.frustumCulled = false
  // Leaves must never block raycasts — each of 32 000 instances would be tested
  // every frame against every collision/floor ray, killing first-person perf.
  mesh.raycast = () => {}
  // Direct typed-array copy avoids allocating count Matrix4 objects on the main thread.
  mesh.instanceMatrix.array.set(floats)
  mesh.instanceMatrix.needsUpdate = true
  disposeObject3D(template)

  return mesh
}

async function buildNode(node, basePath) {
  if (node.type === 'InstancedMesh') {
    return buildInstancedMesh(node, basePath)
  }

  let object3d

  const baseName = modelBaseName(node.name)
  const modelPaths = []
  for (const ext of ['.glb', '.gltf']) {
    const modelPath = `${basePath}${baseName}${ext}`
    modelPaths.push(modelPath)
    try {
      object3d = await loadModel(modelPath)
      await applyAutoTextures(object3d, baseName)
      object3d.name = node.name
      break
    } catch {
      // No matching asset — try next extension.
    }
  }

  // Fallback to empty pivot so the rest of the hierarchy still places correctly.
  if (!object3d) {
    warnMissingAsset(`No model found for "${node.name}" (${modelPaths.join(', ')})`)
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
  root.userData.hutPosition = findNodePosition(nodes, 'hut01')
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
