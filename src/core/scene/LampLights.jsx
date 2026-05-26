import { useEffect, useRef, useMemo } from 'react'
import * as THREE from 'three'

const LAMP_GROUP_NAMES = new Set(['lampe', 'lampe-mushroom'])

const tempMatrix = new THREE.Matrix4()
const tempPos = new THREE.Vector3()
const tempScale = new THREE.Vector3()

// Two shadow-casting SpotLights covering the main interior zones.
// SpotLight = 1 shadow map (vs 6 for PointLight) — 2 total shadow renders/frame.
const ZONE_SPOT_LIGHTS = [
  { position: [-85, 14, -18], targetOffset: [0, -10, 0] }, // Nest platform
  { position: [-72, 7, -48], targetOffset: [0, -10, 0] },  // Atelier
]

function ZoneSpotLight({ position, targetOffset }) {
  const ref = useRef()

  useEffect(() => {
    if (!ref.current) return
    const [tx, ty, tz] = targetOffset
    ref.current.target.position.set(position[0] + tx, position[1] + ty, position[2] + tz)
    ref.current.target.updateMatrixWorld()
  }, [position, targetOffset])

  return (
    <spotLight
      ref={ref}
      position={position}
      color="#ffdd99"
      intensity={8}
      distance={18}
      angle={Math.PI / 3}
      penumbra={0.4}
      decay={2}
      castShadow
      shadow-mapSize-width={512}
      shadow-mapSize-height={512}
      shadow-bias={-0.001}
    />
  )
}

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

  return (
    <>
      {ZONE_SPOT_LIGHTS.map(({ position, targetOffset }) => (
        <ZoneSpotLight key={position.join(',')} position={position} targetOffset={targetOffset} />
      ))}
      {positions.map(([x, y, z]) => (
        <pointLight
          key={`${x},${y},${z}`}
          position={[x, y, z]}
          color="#ffdd99"
          intensity={3}
          distance={10}
          decay={2}
        />
      ))}
    </>
  )
}
