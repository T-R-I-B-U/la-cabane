import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// Color code: orange = wall, green = floor, yellow = stair.
export function CollisionDebug({ cabane }) {
  const groupRef = useRef()

  useEffect(() => {
    if (!cabane || !groupRef.current) return
    const group = groupRef.current

    cabane.traverse((obj) => {
      if (!obj.isMesh || obj.isInstancedMesh) return
      const color = obj.userData.isFloor ? 0x00ff44 : obj.userData.isStair ? 0xffee00 : 0xff4400
      const edges = new THREE.EdgesGeometry(obj.geometry)
      const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color }))
      line.raycast = () => {} // must not interfere with collision raycasters
      obj.updateWorldMatrix(true, false)
      line.applyMatrix4(obj.matrixWorld)
      group.add(line)
    })

    return () => {
      group.children.forEach((c) => {
        c.geometry.dispose()
        c.material.dispose()
      })
      group.clear()
    }
  }, [cabane])

  return <group ref={groupRef} />
}
