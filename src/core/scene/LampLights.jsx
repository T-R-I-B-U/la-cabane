import { useMemo } from 'react'
import * as THREE from 'three'

const LAMP_GROUP_NAMES = new Set(['lampe', 'lampe-mushroom'])

const tempMatrix = new THREE.Matrix4()
const tempPos = new THREE.Vector3()
const tempScale = new THREE.Vector3()

export function LampLights({ cabane }) {
  const positions = useMemo(() => {
    if (!cabane) return []
    const result = []

    cabane.traverse((obj) => {
      if (!LAMP_GROUP_NAMES.has(obj.name)) return

      const im = obj.children.find((c) => c.isInstancedMesh)
      if (!im) return

      if (!im.geometry.boundingBox) im.geometry.computeBoundingBox()
      const topY = im.geometry.boundingBox.max.y

      for (let i = 0; i < im.count; i++) {
        im.getMatrixAt(i, tempMatrix)
        tempPos.setFromMatrixPosition(tempMatrix)
        tempScale.setFromMatrixScale(tempMatrix)
        result.push([tempPos.x, tempPos.y + topY * tempScale.y, tempPos.z])
      }
    })

    return result
  }, [cabane])

  return positions.map(([x, y, z]) => (
    <pointLight
      key={`${x},${y},${z}`}
      position={[x, y, z]}
      color="#ffdd99"
      intensity={3}
      distance={10}
      decay={2}
      castShadow
      shadow-mapSize-width={256}
      shadow-mapSize-height={256}
      shadow-bias={-0.005}
    />
  ))
}
