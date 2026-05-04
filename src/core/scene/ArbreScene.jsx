import { TriggerZone } from '../../world/interactions/TriggerZone'
import { GrowingFruit } from '../../world/entities/GrowingFruit'
import { Fruit } from '../../world/entities/Fruit'
import { setZone } from '../../utils/gameManagerStore'
import { PLATFORM_POS } from '../SceneConfig'

// Radius at which the player is considered to have left the tree and returned to ground.
const CABANE_TRIGGER_RADIUS = 10

/**
 */
export function ArbreScene({ interactionsActive, onFruitClick, onFruitHover }) {
  return (
    <>
      <GrowingFruit />
      <Fruit
        fruitId="fruit_01"
        position={[-23, 25.5, -9]}
        active={interactionsActive}
        onFruitClick={onFruitClick}
        onFruitHover={onFruitHover}
      />
      <TriggerZone
        center={PLATFORM_POS}
        radius={CABANE_TRIGGER_RADIUS}
        onLeave={() => setZone('cabane')}
      />
    </>
  )
}
