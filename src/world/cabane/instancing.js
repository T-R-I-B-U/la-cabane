import * as THREE from 'three'
import { loadModel } from '../../core/Loader'
import { disposeObject3D } from '../../core/disposeObject3D'
import { modelBaseName } from './assetNaming'
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

export async function buildInstancedMesh(node, { modelBasePaths }) {
  const baseName = modelBaseName(node.name)

  let template = null
  const templatePaths = getModelCandidates(baseName, modelBasePaths)
  const loadErrors = []
  for (const modelPath of templatePaths) {
    try {
      template = await loadModel(modelPath)
      break
    } catch (error) {
      loadErrors.push(`${modelPath}: ${error.message ?? error}`)
      // Try next extension.
    }
  }

  if (!template) {
    warnMissingAsset(
      `No template model found for "${node.name}" (${templatePaths.join(', ')}). ${loadErrors.join(' | ')}`
    )
  }

  let count = 0
  let floats = null
  const instancePaths = getInstanceCandidates(baseName, modelBasePaths)
  let loadedInstancePath = null
  for (const instancePath of instancePaths) {
    try {
      const response = await fetch(instancePath)
      if (!response.ok) continue

      const buffer = await response.arrayBuffer()
      count = new DataView(buffer).getUint32(0, true)
      floats = new Float32Array(buffer, 4, count * 16)
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

  if (!template || count === 0 || !floats) {
    const group = new THREE.Group()
    group.name = node.name
    group.userData.cabaneNode = true
    applyTransform(group, node)
    return group
  }

  let geometry = null
  let material = null
  const templateRoot = template.children[0] ?? null
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
  mesh.instanceMatrix.array.set(floats)
  mesh.instanceMatrix.needsUpdate = true
  disposeObject3D(template)

  return mesh
}
