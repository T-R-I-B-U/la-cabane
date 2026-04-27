import * as THREE from 'three'
import { loadModel } from '../../core/Loader'
import { applyAutoTextures } from './textureResolver'
import { buildInstancedMesh } from './instancing'
import { modelBaseName } from './assetNaming'
import { applyTransform, warnMissingAsset } from './runtime'

export async function buildNode(node, basePath) {
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
      // Try next extension.
    }
  }

  if (!object3d) {
    warnMissingAsset(`No model found for "${node.name}" (${modelPaths.join(', ')})`)
    object3d = new THREE.Group()
    object3d.name = node.name
  }

  object3d.userData.cabaneNode = true

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
