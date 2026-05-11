import * as THREE from 'three'
import { loadModel } from '../../core/Loader'
import { disposeObject3D } from '../../core/disposeObject3D'
import { modelBaseName } from './assetNaming'
import { applyAutoTextures } from './textureResolver'
import { applyTransform, cloneMaterialWithTextures, warnMissingAsset } from './runtime'

function getModelCandidates(baseName, modelBasePaths) {
  return modelBasePaths.flatMap((basePath) => [
    `${basePath}${baseName}.glb`,
    `${basePath}${baseName}.gltf`,
  ])
}

function getInstanceCandidates(baseName, modelBasePaths) {
  return modelBasePaths.map((basePath) => `${basePath}${baseName}.bin`)
}

export async function buildInstancedMesh(
  node,
  { modelBasePaths, textureBasePaths = ['/textures/'] }
) {
  const baseName = modelBaseName(node.name)

  let templateModel = null
  const templatePaths = getModelCandidates(baseName, modelBasePaths)
  const loadErrors = []
  for (const modelPath of templatePaths) {
    try {
      templateModel = await loadModel(modelPath)
      await applyAutoTextures(templateModel, baseName, textureBasePaths)
      break
    } catch (error) {
      loadErrors.push(`${modelPath}: ${error.message ?? error}`)
      // Try next extension.
    }
  }

  if (!templateModel) {
    warnMissingAsset(
      `No template model found for "${node.name}" (${templatePaths.join(', ')}). ${loadErrors.join(' | ')}`
    )
  }

  let instanceCount = 0
  let instanceMatrixArray = null
  const instancePaths = getInstanceCandidates(baseName, modelBasePaths)
  let loadedInstancePath = null
  for (const instancePath of instancePaths) {
    try {
      const response = await fetch(instancePath)
      if (!response.ok) continue

      const buffer = await response.arrayBuffer()
      if (buffer.byteLength < 4) {
        throw new Error(
          `Invalid instance matrix file: expected header, got ${buffer.byteLength} bytes`
        )
      }

      instanceCount = new DataView(buffer).getUint32(0, true)

      const expectedFloatCount = instanceCount * 16
      const actualFloatCount = (buffer.byteLength - 4) / 4
      if (!Number.isInteger(actualFloatCount) || actualFloatCount !== expectedFloatCount) {
        throw new Error(
          `Invalid instance matrix file: expected ${expectedFloatCount} floats, got ${actualFloatCount}`
        )
      }

      instanceMatrixArray = new Float32Array(buffer, 4, instanceCount * 16)
      loadedInstancePath = instancePath
      break
    } catch (error) {
      warnMissingAsset(
        `Cannot load instance matrix file for "${node.name}" (${instancePath}): ${error}`
      )
    }
  }

  if (!loadedInstancePath) {
    warnMissingAsset(
      `No instance matrix file found for "${node.name}" (${instancePaths.join(', ')})`
    )
  }

  if (!templateModel || instanceCount === 0 || !instanceMatrixArray) {
    const group = new THREE.Group()
    group.name = node.name
    group.userData.cabaneNode = true
    applyTransform(group, node)
    return group
  }

  let geometry = null
  let material = null
  const templateRoot = templateModel.children[0] ?? null
  templateModel.traverse((child) => {
    if (!geometry && child.isMesh) {
      geometry = child.geometry.clone()
      material = cloneMaterialWithTextures(child.material)
      const materials = Array.isArray(material) ? material : [material]
      materials.forEach((entry) => {
        if (entry) entry.side = THREE.DoubleSide
      })
    }
  })

  if (!geometry || !material) {
    warnMissingAsset(`Template model for "${node.name}" does not contain a usable mesh/material`)
    disposeObject3D(templateModel)
    const group = new THREE.Group()
    group.name = node.name
    group.userData.cabaneNode = true
    applyTransform(group, node)
    return group
  }

  const mesh = new THREE.InstancedMesh(geometry, material, instanceCount)
  mesh.name = node.name
  mesh.userData.cabaneNode = true
  const [px, py, pz] = node.position
  const [rx, ry, rz] = node.rotation
  const [sx, sy, sz] = node.scale
  if (templateRoot) {
    // Mapper-exported instance matrices are authored in the source scene space.
    // Shift only by the delta between the exported template root and the cabane
    // target node so the whole cloud lands at the expected scene offset.
    mesh.position.set(
      px - templateRoot.position.x,
      py - templateRoot.position.y,
      pz - templateRoot.position.z
    )
    mesh.rotation.set(rx, ry, rz)
    mesh.scale.set(sx, sy, sz)
  } else {
    applyTransform(mesh, node)
  }
  mesh.frustumCulled = false
  mesh.raycast = () => {}
  mesh.instanceMatrix.array.set(instanceMatrixArray)
  mesh.instanceMatrix.needsUpdate = true
  disposeObject3D(templateModel)

  return mesh
}
