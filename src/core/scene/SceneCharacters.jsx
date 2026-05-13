import { Suspense, useEffect, useState } from 'react'
import { AnimatedCharacter } from '../../world/entities/AnimatedCharacter'
import { ClickableThomas } from '../../world/entities/ClickableThomas'
import { FLOOR_Y } from '../SceneConfig'
import { getRegistry, onRegistryChange } from '../cameraRegistry'
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
  if (compressedModelFiles.has(compressedUrl)) {
    return `/models/compressed/${fileName}`
  }

  return `/models/${fileName}`
}

const MARIE_SEQUENCES = {
  idle: [{ clip: 'marie-standiing-idle', duration: 999 }],
}

function getCharacterConfig(id) {
  return getRegistry().characters?.find((character) => character.id === id) ?? null
}

function toPositionArray(character, fallback) {
  const position = character?.position
  if (!position) return fallback
  return [position.x, position.y, position.z]
}

export function SceneCharacters({
  performanceMode,
  thomasEtabliPhaseActive,
  onThomasEtabliInteract,
  thomasAnimPhase = 'back',
  showCabaneInterior = true,
}) {
  const [characters, setCharacters] = useState(() => getRegistry().characters ?? [])
  const thomasUrl = resolveCharacterUrl('thomas-animated.glb', performanceMode)
  const marieUrl = resolveCharacterUrl('marie-animated.glb', performanceMode)
  const textureBasePaths = performanceMode
    ? ['/textures/ktx2/', '/textures/compressed/', '/textures/']
    : ['/textures/ktx2/', '/textures/']
  const sequence = THOMAS_SEQUENCES[thomasAnimPhase] ?? THOMAS_SEQUENCES.back
  const thomas = characters.find((character) => character.id === 'thomas') ?? getCharacterConfig('thomas')
  const marie = characters.find((character) => character.id === 'marie') ?? getCharacterConfig('marie')
  const thomasPosition = toPositionArray(thomas, [-3.0, FLOOR_Y, -13.259])
  const mariePosition = toPositionArray(marie, [-20.0, 9.15, 24.0])

  useEffect(() => onRegistryChange((registry) => setCharacters(registry.characters ?? [])), [])

  return (
    <>
      {showCabaneInterior && (
        <>
          <ClickableThomas
            active={thomasEtabliPhaseActive}
            position={thomasPosition}
            onInteract={onThomasEtabliInteract}
          />
          <Suspense fallback={null}>
            <AnimatedCharacter
              key={thomasUrl}
              url={thomasUrl}
              animationSequence={sequence}
              textureName="thomas"
              textureBasePaths={textureBasePaths}
              position={thomasPosition}
              rotation={[0, thomas?.rotationY ?? (150 * Math.PI) / 180, 0]}
              scale={thomas?.scale ?? 9}
            />
          </Suspense>
        </>
      )}
      <Suspense fallback={null}>
        <AnimatedCharacter
          key={marieUrl}
          url={marieUrl}
          animationSequence={MARIE_SEQUENCES.idle}
          textureName="marie-animated"
          textureBasePaths={textureBasePaths}
          position={mariePosition}
          rotation={[0, marie?.rotationY ?? (160 * Math.PI) / 180, 0]}
          scale={marie?.scale ?? 9}
        />
      </Suspense>
    </>
  )
}
