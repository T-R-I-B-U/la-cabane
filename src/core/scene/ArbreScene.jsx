import { TriggerZone } from '../../world/interactions/TriggerZone'
import { setZone } from '../../utils/gameManagerStore'
import { PLATFORM_POS } from '../SceneConfig'

// Radius at which the player is considered to have left the tree and returned to ground.
const CABANE_TRIGGER_RADIUS = 10

/**
 */
export function ArbreScene({ platformPosition }) {
  return (
    <TriggerZone
      center={platformPosition ?? PLATFORM_POS}
      radius={CABANE_TRIGGER_RADIUS}
      onLeave={() => setZone('cabane')}
    />
  )
}
