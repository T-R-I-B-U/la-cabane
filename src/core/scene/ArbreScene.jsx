import { useCallback, useMemo } from 'react'
import { TriggerZone } from '../../world/interactions/TriggerZone'
import { GrowingFruit } from '../../world/entities/GrowingFruit'
import { Fruit } from '../../world/entities/Fruit'
import { InteractionPoint } from '../../world/entities/InteractionPoint'
import { setZone } from '../../utils'
import { DEFAULT_HUT_POS, PLATFORM_POS, PLAYER_HEIGHT } from '../SceneConfig'

const CABANE_TRIGGER_RADIUS = 10

// Fruit positions computed relative to the platform so they move with the real GLTF.
function usePlatformLayout(platformPosition, hutPosition) {
  return useMemo(() => {
    const pos = platformPosition ?? PLATFORM_POS
    const [px, py, pz] = pos
    const eyeY = py + PLAYER_HEIGHT + 3
    const hutY = Array.isArray(hutPosition) ? hutPosition[1] : DEFAULT_HUT_POS[1]

    return {
      // Growing fruit hanging right in front at eye level
      playerFruit: [px, eyeY, pz - 1],
      // Static fruits a bit higher in the foliage
      staticFruits: [
        { id: 'fruit_arbre_01', position: [px + 1.5, eyeY + 3, pz - 2] },
        { id: 'fruit_arbre_02', position: [px - 1.5, eyeY + 3.5, pz - 1.5] },
        { id: 'fruit_arbre_03', position: [px + 2, eyeY + 2, pz + 1] },
        { id: 'fruit_arbre_04', position: [px - 2, eyeY + 2.5, pz + 1.5] },
      ],
      // Ladder POI at hut-platform level, in front of the tree trunk
      ladderPOI: [px, hutY + PLAYER_HEIGHT, pz + 1],
    }
  }, [platformPosition, hutPosition])
}

export function ArbreScene({
  platformPosition,
  hutPosition,
  arbreActive,
  ladderClickActive,
  onLadderClick,
  growingFruitPlaying,
  fruitsClickActive,
  onFruitClickDuringLeaves,
  onFruitClick,
  onFruitHover,
  interactionsEnabled,
}) {
  const { playerFruit, staticFruits, ladderPOI } = usePlatformLayout(platformPosition, hutPosition)

  const handleFruitInteract = useCallback(
    (fruitId) => {
      if (fruitsClickActive) onFruitClickDuringLeaves?.()
      else onFruitClick?.(fruitId)
    },
    [fruitsClickActive, onFruitClickDuringLeaves, onFruitClick]
  )

  return (
    <>
      <TriggerZone
        center={platformPosition ?? PLATFORM_POS}
        radius={CABANE_TRIGGER_RADIUS}
        onLeave={() => setZone('cabane')}
      />

      <InteractionPoint position={ladderPOI} active={ladderClickActive} onInteract={onLadderClick} />
      {ladderClickActive && (
        <mesh position={ladderPOI}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshBasicMaterial color={0xffdd55} transparent opacity={0.8} depthTest={false} />
        </mesh>
      )}

      <GrowingFruit position={playerFruit} playing={growingFruitPlaying} />

      {staticFruits.map(({ id, position }) => (
        <Fruit
          key={id}
          fruitId={id}
          position={position}
          active={fruitsClickActive || (!arbreActive && interactionsEnabled)}
          onFruitClick={handleFruitInteract}
          onFruitHover={onFruitHover}
        />
      ))}
    </>
  )
}
