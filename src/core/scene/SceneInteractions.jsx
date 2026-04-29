import { useCallback, useRef } from 'react'
import { ClickableDoor } from '../../world/entities/ClickableDoor'
import { InteractionPoint } from '../../world/entities/InteractionPoint'
import { FLOOR_Y } from '../SceneConfig'

export function SceneInteractions({
  cabane,
  hutPosition,
  playerMode,
  postIntro,
  interactionLocked,
  introWaitingAtDoor,
  onIntroEvent,
  onNpcInteract,
  onNpcHover,
}) {
  const npcHoveredMap = useRef({ marie: false, thomas: false })

  const createHoverHandler = useCallback(
    (npcId) => (isHovered) => {
      npcHoveredMap.current[npcId] = isHovered
      onNpcHover?.(Object.values(npcHoveredMap.current).some(Boolean))
    },
    [onNpcHover]
  )

  const onMarieHover = createHoverHandler('marie')
  const onThomasHover = createHoverHandler('thomas')
  const interactionsActive = (playerMode || postIntro) && !interactionLocked

  return (
    <>
      <InteractionPoint
        position={[hutPosition[0] + 1.4, FLOOR_Y + 0.9, hutPosition[2] - 8.1]}
        active={interactionsActive}
        onInteract={() => onNpcInteract?.('marie')}
        onHoverChange={onMarieHover}
      />
      <InteractionPoint
        position={[hutPosition[0] + 2.7, FLOOR_Y + 0.9, hutPosition[2] - 8.1]}
        active={interactionsActive}
        onInteract={() => onNpcInteract?.('thomas')}
        onHoverChange={onThomasHover}
      />

      <ClickableDoor
        cabane={cabane}
        active={introWaitingAtDoor}
        onDoorClick={() => onIntroEvent?.('door:clicked')}
      />
    </>
  )
}
