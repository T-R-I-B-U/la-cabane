import { useMemo } from 'react'
import * as THREE from 'three'
import { ClickableDoor } from '../../world/entities/ClickableDoor'
import { ClickableReception } from '../../world/entities/ClickableReception'
import { JournalBook } from '../../world/entities/JournalBook'

const JOURNAL_OFFSET = { x: 0.68, y: 0, z: 1.77 }
const JOURNAL_ROTATION_Y = 0.41

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
  onJournalOpenComplete,
  onJournalCancel,
  onJournalPiecePlaced,
  journalAutoOpenToken,
  journalCloseToken,
  journalPuzzleEnabled,
  journalVisible = true,
}) {
  const interactionsActive = (playerMode || postIntro) && !interactionLocked
  const journalActive = interactionsActive && journalUnlocked
  const bookPosition = useMemo(() => {
    if (!cabane) return null

    const counter = cabane.getObjectByName('counter01')
    if (!counter) return null

    counter.updateWorldMatrix(true, true)

    const bounds = new THREE.Box3().setFromObject(counter)
    const center = bounds.getCenter(new THREE.Vector3())
    const offset = new THREE.Vector3(
      JOURNAL_OFFSET.x,
      JOURNAL_OFFSET.y,
      JOURNAL_OFFSET.z
    ).applyQuaternion(counter.getWorldQuaternion(new THREE.Quaternion()))

    return [center.x + offset.x, bounds.max.y + offset.y, center.z + offset.z]
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
          autoOpenToken={journalAutoOpenToken}
          closeToken={journalCloseToken}
          pieceInteractionEnabled={journalPuzzleEnabled}
          rotationY={JOURNAL_ROTATION_Y}
          onInteractionStart={onJournalStart}
          onInteractionEnd={onJournalEnd}
          onOpenComplete={onJournalOpenComplete}
          onInteractionCancel={onJournalCancel}
          onPiecePlaced={onJournalPiecePlaced}
        />
      )}
    </>
  )
}
