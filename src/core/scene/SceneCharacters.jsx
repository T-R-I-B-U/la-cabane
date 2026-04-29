import { Suspense } from 'react'
import { AnimatedCharacter } from '../../world/entities/AnimatedCharacter'
import { FLOOR_Y } from '../SceneConfig'

const compressedModelModules = import.meta.glob('/public/models/compressed/*.{glb,gltf}')

function resolveCharacterUrl(fileName, performanceMode) {
  const compressedKey = `/public/models/compressed/${fileName}`
  if (performanceMode && compressedModelModules[compressedKey]) {
    return `/models/compressed/${fileName}`
  }

  return `/models/${fileName}`
}

export function SceneCharacters({ performanceMode, hutPosition, marieClip, thomasClip }) {
  const marieUrl = resolveCharacterUrl('marie-animated.glb', performanceMode)
  const thomasUrl = resolveCharacterUrl('thomas-animated.glb', performanceMode)
  const textureBasePaths = performanceMode
    ? ['/textures/compressed/', '/textures/']
    : ['/textures/']

  return (
    <Suspense fallback={null}>
      <AnimatedCharacter
        key={marieUrl}
        url={marieUrl}
        clip={marieClip}
        textureName="marie"
        textureBasePaths={textureBasePaths}
        position={[hutPosition[0] + 1.4, FLOOR_Y, hutPosition[2] - 9.1]}
        rotation={[0, Math.PI * 0.08, 0]}
        scale={9}
      />
      <AnimatedCharacter
        key={thomasUrl}
        url={thomasUrl}
        clip={thomasClip}
        textureName="thomas"
        textureBasePaths={textureBasePaths}
        position={[hutPosition[0] + 2.7, FLOOR_Y, hutPosition[2] - 9.1]}
        rotation={[0, Math.PI * 1.04, 0]}
        scale={9}
      />
    </Suspense>
  )
}
