import { Suspense } from 'react'
import { AnimatedCharacter } from '../../world/entities/AnimatedCharacter'
import { FLOOR_Y } from '../SceneConfig'

const compressedModelModules = import.meta.glob('/public/models/compressed/*.{glb,gltf}')
const ZOE_ANIMATION_SEQUENCE = [
  { clip: 'zoe-idle', duration: 5 },
  { clip: 'zoe-pointing' },
  { clip: 'zoe-idle', duration: 5 },
  { clip: 'zoe-pointing', reverse: true },
]
const MARIE_ANIMATION_SEQUENCE = [
  { clip: 'marie-sitting-idle', duration: 5 },
  { clip: 'marie-standingup' },
  { clip: 'marie-standiing-idle', duration: 5 },
  { clip: 'marie-standingup', reverse: true },
]
const THOMAS_ANIMATION_SEQUENCE = [
  { clip: 'thomas-back', duration: 5 },
  { clip: 'thomas-turn' },
  { clip: 'thomas-front', duration: 5 },
  { clip: 'thomas-turn', reverse: true },
]

function resolveCharacterUrl(fileName, performanceMode) {
  const compressedKey = `/public/models/compressed/${fileName}`
  if (performanceMode && compressedModelModules[compressedKey]) {
    return `/models/compressed/${fileName}`
  }

  return `/models/${fileName}`
}

export function SceneCharacters({ performanceMode, hutPosition }) {
  // Zoe's compressed GLB is stale after the latest model edit, so keep the source GLB for now.
  const zoeUrl = resolveCharacterUrl('zoe-animated.glb', false)
  const marieUrl = resolveCharacterUrl('marie-animated.glb', performanceMode)
  const thomasUrl = resolveCharacterUrl('thomas-animated.glb', performanceMode)
  const textureBasePaths = performanceMode
    ? ['/textures/compressed/', '/textures/']
    : ['/textures/']

  return (
    <Suspense fallback={null}>
      <AnimatedCharacter
        key={zoeUrl}
        url={zoeUrl}
        animationUrl="/models/compressed/zoe-animated.glb"
        animationSequence={ZOE_ANIMATION_SEQUENCE}
        textureName="zoe-animated"
        textureBasePaths={textureBasePaths}
        position={[hutPosition[0] + 0.1, FLOOR_Y, hutPosition[2] - 9.1]}
        rotation={[0, Math.PI * 0.08, 0]}
        scale={9}
      />
      <AnimatedCharacter
        key={marieUrl}
        url={marieUrl}
        animationSequence={MARIE_ANIMATION_SEQUENCE}
        textureName="marie"
        textureBasePaths={textureBasePaths}
        position={[hutPosition[0] + 1.4, FLOOR_Y, hutPosition[2] - 9.1]}
        rotation={[0, Math.PI * 0.08, 0]}
        scale={9}
      />
      <AnimatedCharacter
        key={thomasUrl}
        url={thomasUrl}
        animationSequence={THOMAS_ANIMATION_SEQUENCE}
        textureName="thomas"
        textureBasePaths={textureBasePaths}
        position={[hutPosition[0] + 2.7, FLOOR_Y, hutPosition[2] - 9.1]}
        rotation={[0, Math.PI * 1.04, 0]}
        scale={9}
      />
    </Suspense>
  )
}
