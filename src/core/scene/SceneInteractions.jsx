import { useMemo } from 'react'
import * as THREE from 'three'
import { ClickableDoor } from '../../world/entities/ClickableDoor'
import { ClickableReception } from '../../world/entities/ClickableReception'
import { JournalBook } from '../../world/entities/JournalBook'

const BOOK_COUNTER_OFFSET = new THREE.Vector3(-1.4586, 0.83, 0.9356)

export function SceneInteractions({
  cabane,
  playerMode,
  postIntro,
  interactionLocked,
  introWaitingAtDoor,
  journalUnlocked,
  receptionActive,
  onIntroEvent,
  onReceptionInteract,
  onJournalStart,
  onJournalEnd,
  onJournalCancel,
  journalVisible = true,
}) {
  const interactionsActive = (playerMode || postIntro) && !interactionLocked
  const journalActive = interactionsActive && journalUnlocked
  const bookPosition = useMemo(() => {
    if (!cabane) return null

    const counter = cabane.getObjectByName('counter01')
    if (!counter) return null

    counter.updateWorldMatrix(true, false)
    return counter.localToWorld(BOOK_COUNTER_OFFSET.clone()).toArray()
  }, [cabane])

  return (
    <>
      <ClickableDoor
        cabane={cabane}
        active={introWaitingAtDoor}
        onDoorClick={() => onIntroEvent?.('door:clicked')}
      />

      <ClickableReception
        cabane={cabane}
        active={receptionActive}
        onInteract={onReceptionInteract}
      />

      {journalVisible && bookPosition && (
        <JournalBook
          position={bookPosition}
          active={journalActive}
          onInteractionStart={onJournalStart}
          onInteractionEnd={onJournalEnd}
          onInteractionCancel={onJournalCancel}
        />
      )}
    </>
  )
}
