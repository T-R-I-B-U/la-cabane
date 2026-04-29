import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { clearTextureCache, buildCabane } from '../../world/entities/Cabane'
import { disposeObject3D } from '../disposeObject3D'

export function CabaneMap({ performanceMode, onReady, onError, onCabaneLoaded }) {
  const [cabane, setCabane] = useState(null)

  useEffect(() => {
    let cancelled = false
    let loadedCabane = null

    buildCabane({ performanceMode })
      .then((group) => {
        if (cancelled) {
          disposeObject3D(group)
          return
        }

        loadedCabane = group
        let meshes = 0
        let pivots = 0
        let platformPosition = null

        group.updateWorldMatrix(true, true)

        group.traverse((object3d) => {
          if (object3d === group) return
          if (object3d.isMesh) meshes += 1
          else if (object3d.userData.cabaneNode) pivots += 1

          if (object3d.isMesh && object3d.name === 'platform') {
            platformPosition = object3d.getWorldPosition(new THREE.Vector3()).toArray()
          }
        })

        onReady({ meshes, pivots, hutPosition: group.userData.hutPosition, platformPosition })
        onCabaneLoaded(group)
        setCabane(group)
      })
      .catch((error) => {
        if (cancelled) return
        onError(error.message ?? String(error))
      })

    return () => {
      cancelled = true
      if (loadedCabane) {
        clearTextureCache()
        disposeObject3D(loadedCabane)
      }
      onCabaneLoaded(null)
    }
  }, [performanceMode, onReady, onError, onCabaneLoaded])

  if (!cabane) return null
  return <primitive object={cabane} />
}
