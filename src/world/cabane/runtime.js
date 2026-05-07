import * as THREE from 'three'

export function applyTransform(object3d, node) {
  const [px, py, pz] = node.position
  const [rx, ry, rz] = node.rotation
  const [sx, sy, sz] = node.scale
  object3d.position.set(px, py, pz)
  object3d.rotation.set(rx, ry, rz)
  object3d.scale.set(sx, sy, sz)
}

export function warnMissingAsset(message) {
  if (!import.meta.env.DEV) return
  console.warn(`[Cabane] ${message}`)
}

export function cloneMaterialWithTextures(material) {
  if (!material) return null
  if (Array.isArray(material)) return material.map(cloneMaterialWithTextures).filter(Boolean)

  const clone = material.clone()

  for (const [key, value] of Object.entries(clone)) {
    if (value?.isTexture) clone[key] = value.clone()
  }

  return clone
}

export function findNodePosition(nodes, name) {
  for (const node of nodes) {
    if (node.name === name && Array.isArray(node.position)) return node.position

    if (node.children?.length) {
      const position = findNodePosition(node.children, name)
      if (position) return position
    }
  }

  return null
}
