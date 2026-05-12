import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { warnMissingAsset } from './runtime'

// Returns a new flat Group replacing object3d:
// same name/transform/userData, but all submeshes merged by mesh name into one Mesh per unique name.
// Each submesh's world transform (relative to object3d) is baked into its cloned geometry,
// so the returned Group has no nested hierarchy — just flat Mesh children.
export function mergeNodeMeshes(object3d) {
  object3d.updateWorldMatrix(false, true)
  const rootInverse = object3d.matrixWorld.clone().invert()

  // Collect meshes grouped by base name (strip trailing _N suffix).
  // Cinema 4D exports unique material instances per mesh even when visually identical,
  // so we group by name pattern: stairs-marche_1..N → stairs-marche, railling_1..N → railling.
  const nameGroups = new Map() // baseName → { material, bakedGeoms: [] }

  object3d.traverse((child) => {
    if (!child.isMesh) return
    const baked = child.geometry.clone()
    const relMatrix = new THREE.Matrix4().multiplyMatrices(rootInverse, child.matrixWorld)
    baked.applyMatrix4(relMatrix)
    const baseName = child.name.replace(/_\d+$/, '')
    if (!nameGroups.has(baseName)) {
      nameGroups.set(baseName, { material: child.material, bakedGeoms: [] })
    }
    nameGroups.get(baseName).bakedGeoms.push(baked)
  })

  if (nameGroups.size === 0) return null

  if (import.meta.env.DEV) {
    const total = [...nameGroups.values()].reduce((sum, g) => sum + g.bakedGeoms.length, 0)
    console.log(`[merge] ${object3d.name}: ${total} meshes → ${nameGroups.size} group(s):`, [
      ...nameGroups.keys(),
    ])
  }

  const result = new THREE.Group()
  result.name = object3d.name
  result.userData = { ...object3d.userData }
  result.position.copy(object3d.position)
  result.quaternion.copy(object3d.quaternion)
  result.scale.copy(object3d.scale)

  for (const [name, { material, bakedGeoms }] of nameGroups) {
    let finalGeom
    if (bakedGeoms.length === 1) {
      finalGeom = bakedGeoms[0]
    } else {
      finalGeom = mergeGeometries(bakedGeoms, false)
      for (const g of bakedGeoms) g.dispose()
      if (!finalGeom) {
        warnMissingAsset(`mergeGeometries failed for "${name}" in "${object3d.name}"`)
        continue
      }
    }
    const mesh = new THREE.Mesh(finalGeom, material)
    mesh.name = name
    mesh.userData.cabaneNode = true
    result.add(mesh)
  }

  if (import.meta.env.DEV) {
    console.log(`[merge] ${object3d.name}: result has ${result.children.length} mesh(es)`)
  }

  return result
}
