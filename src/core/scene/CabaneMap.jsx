import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { clearTextureCache, buildCabane } from '../../world/entities/Cabane'
import { disposeObject3D } from '../disposeObject3D'

export function CabaneMap({ performanceMode, onReady, onError, onCabaneLoaded }) {
  const [cabane, setCabane] = useState(null)

  useEffect(() => {
    let cancelled = false
    let loadedCabaneGroup = null

    buildCabane({ performanceMode })
      .then((group) => {
        if (cancelled) {
          disposeObject3D(group)
          return
        }

        loadedCabaneGroup = group
        let meshCount = 0
        let pivotCount = 0
        let platformPosition = null

        group.updateWorldMatrix(true, true)

        group.traverse((object3d) => {
          if (object3d === group) return
          if (object3d.isMesh) meshCount += 1
          else if (object3d.userData.cabaneNode) pivotCount += 1

          if (object3d.isMesh && object3d.name === 'platform') {
            platformPosition = object3d.getWorldPosition(new THREE.Vector3()).toArray()
          }
        })

        onReady({
          meshes: meshCount,
          pivots: pivotCount,
          hutPosition: group.userData.hutPosition,
          platformPosition,
        })
        onCabaneLoaded(group)
        setCabane(group)
      })
      .catch((error) => {
        if (cancelled) return
        onError(error.message ?? String(error))
      })

    return () => {
      cancelled = true
      setCabane(null)
      if (loadedCabaneGroup) {
        clearTextureCache()
        disposeObject3D(loadedCabaneGroup)
      }
      onCabaneLoaded(null)
    }
  }, [performanceMode, onReady, onError, onCabaneLoaded])

  if (!cabane) return null
  return <primitive object={cabane} />
}
