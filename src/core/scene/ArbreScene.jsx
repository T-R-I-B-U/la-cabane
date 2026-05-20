import { useCallback, useMemo } from 'react'
import { TriggerZone } from '../../world/interactions/TriggerZone'
import { GrowingFruit } from '../../world/entities/GrowingFruit'
import { Fruit } from '../../world/entities/Fruit'
import { setZone } from '../../utils'
import { PLATFORM_POS, PLAYER_HEIGHT } from '../SceneConfig'

const CABANE_TRIGGER_RADIUS = 10

function usePlatformLayout(platformPosition) {
  return useMemo(() => {
    const pos = platformPosition ?? PLATFORM_POS
    const [px, py, pz] = pos
    const eyeY = py + PLAYER_HEIGHT + 3

    return {
      playerFruit: [px - 2.5, eyeY + 2, pz - 2],
      staticFruits: [
        { id: 'fruit_arbre_01', position: [px + 1.5, eyeY + 3, pz - 2] },
        { id: 'fruit_arbre_02', position: [px - 1.5, eyeY + 3.5, pz - 1.5] },
        { id: 'fruit_arbre_03', position: [px + 2, eyeY + 2, pz + 1] },
        { id: 'fruit_arbre_04', position: [px - 2, eyeY + 2.5, pz + 1.5] },
      ],
    }
  }, [platformPosition])
}

export function ArbreScene({
  platformPosition,
  growingFruitPlaying,
  growingFruitClickable,
  fruitsDisabled,
  onGrowingFruitComplete,
  onFruitClick,
  onFruitHover,
}) {
  const { playerFruit, staticFruits } = usePlatformLayout(platformPosition)

  const handleFruitInteract = useCallback(
    (fruitId) => {
      onFruitClick?.(fruitId)
    },
    [onFruitClick]
  )

  return (
    <>
      <TriggerZone
        center={platformPosition ?? PLATFORM_POS}
        radius={CABANE_TRIGGER_RADIUS}
        onLeave={() => setZone('cabane')}
      />

      <GrowingFruit
        position={playerFruit}
        playing={growingFruitPlaying}
        active={growingFruitClickable}
        onComplete={onGrowingFruitComplete}
        onFruitClick={() => onFruitClick?.('fruit_player')}
        onFruitHover={onFruitHover}
      />

      {staticFruits.map(({ id, position }) => (
        <Fruit
          key={id}
          fruitId={id}
          position={position}
          active={growingFruitClickable && !fruitsDisabled}
          onFruitClick={handleFruitInteract}
          onFruitHover={onFruitHover}
        />
      ))}
    </>
  )
}
