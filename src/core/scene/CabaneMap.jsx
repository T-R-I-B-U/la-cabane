import { useEffect, useState } from 'react'
import { clearTextureCache, buildCabane } from '../../world/entities/Cabane'
import { disposeObject3D } from '../disposeObject3D'

export function CabaneMap({ onReady, onError, onCabaneLoaded }) {
  const [cabane, setCabane] = useState(null)

  useEffect(() => {
    let cancelled = false
    let loadedCabane = null

    buildCabane()
      .then((group) => {
        if (cancelled) {
          disposeObject3D(group)
          return
        }

        loadedCabane = group
        let meshes = 0
        let pivots = 0

        group.traverse((object3d) => {
          if (object3d === group) return
          if (object3d.isMesh) meshes += 1
          else if (object3d.userData.cabaneNode) pivots += 1
        })

        onReady({ meshes, pivots, hutPosition: group.userData.hutPosition })
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
  }, [onReady, onError, onCabaneLoaded])

  if (!cabane) return null
  return <primitive object={cabane} />
}
