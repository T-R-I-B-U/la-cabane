import { Suspense } from 'react'
import { AnimatedCharacter } from '../../world/entities/AnimatedCharacter'
import { ClickableThomas } from '../../world/entities/ClickableThomas'
import { FLOOR_Y } from '../SceneConfig'
import { publicAssetManifest } from 'virtual:public-asset-manifest'

const compressedModelFiles = new Set(publicAssetManifest.compressedModelFiles)
const THOMAS_SEQUENCES = {
  back: [{ clip: 'thomas-back', duration: 999 }],
  talking: [{ clip: 'thomas-turn' }, { clip: 'thomas-front', duration: 999 }],
  returning: [
    { clip: 'thomas-turn', reverse: true },
    { clip: 'thomas-back', duration: 999 },
  ],
}

function resolveCharacterUrl(fileName, performanceMode) {
  const compressedUrl = `/models/compressed/${fileName}`
  if (performanceMode && compressedModelFiles.has(compressedUrl)) {
    return `/models/compressed/${fileName}`
  }

  return `/models/${fileName}`
}

export function SceneCharacters({
  performanceMode,
  thomasEtabliPhaseActive,
  onThomasEtabliInteract,
  thomasAnimPhase = 'back',
}) {
  const thomasUrl = resolveCharacterUrl('thomas-animated.glb', performanceMode)
  const textureBasePaths = performanceMode
    ? ['/textures/compressed/', '/textures/']
    : ['/textures/']
  const sequence = THOMAS_SEQUENCES[thomasAnimPhase] ?? THOMAS_SEQUENCES.back

  return (
    <>
      <ClickableThomas active={thomasEtabliPhaseActive} onInteract={onThomasEtabliInteract} />
      <Suspense fallback={null}>
        <AnimatedCharacter
          key={thomasUrl}
          url={thomasUrl}
          animationSequence={sequence}
          textureName="thomas"
          textureBasePaths={textureBasePaths}
          position={[-3.0, FLOOR_Y, -13.259]}
          rotation={[0, (110 * Math.PI) / 180, 0]}
          scale={9}
        />
      </Suspense>
    </>
  )
}
