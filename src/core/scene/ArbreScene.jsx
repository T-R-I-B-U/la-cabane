import { useCallback, useMemo } from 'react'
import { TriggerZone } from '../../world/interactions/TriggerZone'
import { GrowingFruit } from '../../world/entities/GrowingFruit'
import { Fruit } from '../../world/entities/Fruit'
import { DecorativeFruit } from '../../world/entities/DecorativeFruit'
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
      decorativeFruits: [
        [px + 4, eyeY + 3, pz - 3],
        [px - 4, eyeY + 4, pz - 4],
        [px + 3.5, eyeY + 2.5, pz + 3],
        [px - 3, eyeY + 5, pz + 2.5],
        [px + 5, eyeY + 3.5, pz + 1],
        [px - 1, eyeY + 5.5, pz - 3.5],
        [px + 6, eyeY + 2, pz - 1],
        [px - 5, eyeY + 3, pz + 1],
        [px + 2, eyeY + 6, pz - 5],
        [px - 2, eyeY + 6.5, pz + 4],
        [px + 4.5, eyeY + 5, pz + 3.5],
        [px - 4.5, eyeY + 2, pz - 2],
        [px + 1, eyeY + 7, pz + 2],
        [px - 6, eyeY + 4.5, pz - 1.5],
        [px + 3, eyeY + 7.5, pz - 4],
        [px - 3.5, eyeY + 7, pz + 3.5],
        [px + 6.5, eyeY + 5.5, pz + 2],
        [px - 2.5, eyeY + 8, pz - 5],
        [px + 0.5, eyeY + 8.5, pz + 4.5],
        [px + 5.5, eyeY + 7, pz - 3],
        [px - 5.5, eyeY + 6, pz + 4],
        [px + 7, eyeY + 3, pz + 0.5],
        [px - 7, eyeY + 5, pz - 2.5],
        [px + 2.5, eyeY + 9, pz + 1.5],
        [px - 1.5, eyeY + 9.5, pz - 4.5],
        [px + 4, eyeY + 8, pz + 5],
        [px - 4, eyeY + 8.5, pz - 5.5],
        [px + 6, eyeY + 6.5, pz - 4.5],
        [px - 6, eyeY + 7.5, pz + 5],
        [px + 3, eyeY + 10, pz - 2],
      ],
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
  const { playerFruit, staticFruits, decorativeFruits } = usePlatformLayout(platformPosition)

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

      {decorativeFruits.map((pos, i) => (
        <DecorativeFruit key={`deco_fruit_${i}`} position={pos} />
      ))}

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
