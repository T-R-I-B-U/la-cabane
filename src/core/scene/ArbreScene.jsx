import { useMemo } from 'react'
import { TriggerZone } from '../../world/interactions/TriggerZone'
import { InteractionPoint } from '../../world/entities/InteractionPoint'
import { GrowingFruit } from '../../world/entities/GrowingFruit'
import { Fruit } from '../../world/entities/Fruit'
import ArbreCamera from '../../world/entities/ArbreCamera'
import { setZone } from '../../utils'
import { PLATFORM_POS, PLAYER_HEIGHT } from '../SceneConfig'

const CABANE_TRIGGER_RADIUS = 10

// Fruit and POI positions are computed relative to the platform so they move with the real GLTF.
function usePlatformLayout(platformPosition) {
  return useMemo(() => {
    const pos = platformPosition ?? PLATFORM_POS
    const [px, py, pz] = pos
    const eyeY = py + PLAYER_HEIGHT + 3 // same as getPlatformSpawn y

    return {
      // POI at base of ladder, a few units below and in front of platform
      ladderPOI: [px, py - 8, pz + 2],
      // Growing fruit hanging right in front at eye level
      playerFruit: [px, eyeY, pz - 1],
      // Static fruits scattered around the foliage
      staticFruits: [
        { id: 'fruit_arbre_01', position: [px + 1.5, eyeY + 1.5, pz - 2] },
        { id: 'fruit_arbre_02', position: [px - 1.5, eyeY + 2, pz - 1.5] },
        { id: 'fruit_arbre_03', position: [px + 2, eyeY + 0.5, pz + 1] },
        { id: 'fruit_arbre_04', position: [px - 2, eyeY + 1, pz + 1.5] },
      ],
    }
  }, [platformPosition])
}

export function ArbreScene({
  platformPosition,
  arbreActive,
  arbreShouldAdvance,
  arbreGrowingFruitPlaying,
  onArbreEvent,
  onFruitClick,
  onFruitHover,
  interactionsEnabled,
}) {
  const { ladderPOI, playerFruit, staticFruits } = usePlatformLayout(platformPosition)

  return (
    <>
      <TriggerZone
        center={platformPosition ?? PLATFORM_POS}
        radius={CABANE_TRIGGER_RADIUS}
        onLeave={() => setZone('cabane')}
      />

      <ArbreCamera
        active={arbreActive}
        shouldAdvance={arbreShouldAdvance}
        platformPosition={platformPosition}
        onEvent={onArbreEvent}
      />

      <InteractionPoint position={ladderPOI} active={!arbreActive} onInteract={() => {}} />

      <GrowingFruit position={playerFruit} playing={arbreGrowingFruitPlaying} />

      {staticFruits.map(({ id, position }) => (
        <Fruit
          key={id}
          fruitId={id}
          position={position}
          active={interactionsEnabled && !arbreActive}
          onFruitClick={onFruitClick}
          onFruitHover={onFruitHover}
        />
      ))}
    </>
  )
}
