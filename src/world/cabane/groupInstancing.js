import * as THREE from 'three'
import { loadModel } from '../../core/Loader'
import { applyAutoTextures } from './textureResolver'
import { assetModelCandidates, modelBaseName } from './assetNaming'
import { cloneMaterialWithTextures, warnMissingAsset } from './runtime'

const INSTANCED_SHADOW_EXCLUDED_GROUPS = new Set(['outsideplant02', 'outsideplant03'])
const INSTANCED_SHADOW_CASTER_GROUPS = new Set([
  'backgroundTree',
  'juicemachine',
  'juiceglass',
  'ladder',
  'stairs01',
  'stairs02',
  'welcome01',
  'railling',
  'railling-hut',
  'timeatm',
  'hill',
  'bulding',
  'lampe',
  'lampe-mushroom',
  'cabinet',
  'shelves',
  'counter01',
  'armchair',
  'chair',
  'chair-large',
  'littletable',
  'stool',
  'basket',
  'drawing',
  'hearth',
  'plant01',
  'plant01-1',
  'plant02',
  'plant02-1',
  'plant03',
  'plant04',
  'plant05',
  'rug01',
  'rug02',
])
const INSTANCED_SHADOW_RECEIVER_GROUPS = new Set([
  'house',
  'lampe',
  'lampe-mushroom',
  'plant01',
  'plant01-1',
  'plant02',
  'plant02-1',
  'plant03',
  'plant04',
  'plant05',
  'counter01',
  'shelves',
  'cabinet',
  'armchair',
  'chair',
  'chair-large',
  'littletable',
  'stool',
  'basket',
  'drawing',
  'hearth',
  'rug01',
  'rug02',
])

function getModelCandidates(baseName, modelBasePaths) {
  return modelBasePaths.flatMap((basePath) =>
    assetModelCandidates(baseName).flatMap((candidate) => [
      `${basePath}${candidate}.glb`,
      `${basePath}${candidate}.gltf`,
    ])
  )
}

// Builds a Group of InstancedMeshes from multiple cabane.json nodes that share the same model.
// Each submesh's local transform (relative to the GLTF's first child) is baked into its geometry,
// so instance matrices are plain TRS from each node's position/rotation/scale — same mapping as buildNode().
export async function buildGroupInstanced(groupName, nodes, { modelBasePaths, textureBasePaths }) {
  const baseName = modelBaseName(groupName)
  const count = nodes.length

  let template = null
  const loadErrors = []
  for (const modelPath of getModelCandidates(baseName, modelBasePaths)) {
    try {
      template = await loadModel(modelPath)
      await applyAutoTextures(template, baseName, textureBasePaths)
      break
    } catch (error) {
      loadErrors.push(`${modelPath}: ${error.message ?? error}`)
    }
  }

  if (!template) {
    warnMissingAsset(`No model found for instanced group "${groupName}". ${loadErrors.join(' | ')}`)
    return null
  }

  template.updateWorldMatrix(true, true)
  const firstChild = template.children[0] ?? null
  const firstChildInverse = firstChild ? firstChild.matrix.clone().invert() : new THREE.Matrix4()

  const subMeshDefs = []
  template.traverse((child) => {
    if (!child.isMesh) return
    const geometry = child.geometry.clone()
    // Bake the submesh's world transform relative to firstChild so instance matrices
    // can be plain TRS values — mirrors buildNode()'s wrapperMatrix = targetMatrix * childInverse.
    const bakeMatrix = new THREE.Matrix4().multiplyMatrices(firstChildInverse, child.matrixWorld)
    geometry.applyMatrix4(bakeMatrix)
    const material = cloneMaterialWithTextures(child.material)
    const materials = Array.isArray(material) ? material : [material]
    materials.forEach((m) => {
      if (m) m.side = THREE.DoubleSide
    })
    subMeshDefs.push({ geometry, material })
  })

  if (subMeshDefs.length === 0) {
    warnMissingAsset(`No meshes in template "${groupName}"`)
    return null
  }

  const instanceMatrices = nodes.map(
    ({ position: [px, py, pz], rotation: [rx, ry, rz], scale: [sx, sy, sz] }) =>
      new THREE.Matrix4().compose(
        new THREE.Vector3(px, py, pz),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
        new THREE.Vector3(sx, sy, sz)
      )
  )

  const group = new THREE.Group()
  group.name = groupName
  group.userData.cabaneNode = true

  for (const { geometry, material } of subMeshDefs) {
    const instancedMesh = new THREE.InstancedMesh(geometry, material, count)
    const isShadowExcluded = INSTANCED_SHADOW_EXCLUDED_GROUPS.has(groupName)
    instancedMesh.castShadow = INSTANCED_SHADOW_CASTER_GROUPS.has(groupName)
    instancedMesh.receiveShadow = !isShadowExcluded && INSTANCED_SHADOW_RECEIVER_GROUPS.has(groupName)
    for (let i = 0; i < count; i++) {
      instancedMesh.setMatrixAt(i, instanceMatrices[i])
    }
    instancedMesh.instanceMatrix.needsUpdate = true
    instancedMesh.computeBoundingBox()
    instancedMesh.computeBoundingSphere()
    instancedMesh.frustumCulled = true
    group.add(instancedMesh)
  }

  return group
}
