import { ClickableDoor } from '../../world/entities/ClickableDoor'
import { JournalBook } from '../../world/entities/JournalBook'

export function SceneInteractions({
  cabane,
  playerMode,
  postIntro,
  interactionLocked,
  introWaitingAtDoor,
  onIntroEvent,
  journalOpen,
  onJournalStart,
  onJournalOpen,
}) {
  const interactionsActive = (playerMode || postIntro) && !interactionLocked

  return (
    <>
      <ClickableDoor
        cabane={cabane}
        active={introWaitingAtDoor}
        onDoorClick={() => onIntroEvent?.('door:clicked')}
      />

      <JournalBook
        position={[-33.8, 0.83, -10.5]}
        active={interactionsActive}
        open={journalOpen}
        onStart={onJournalStart}
        onOpen={onJournalOpen}
      />
    </>
  )
}
