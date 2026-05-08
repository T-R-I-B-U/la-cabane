import { Suspense, useMemo } from 'react'
import * as THREE from 'three'
import { ClickableDoor } from '../../world/entities/ClickableDoor'
import { ClickableGreenhouseDoor } from '../../world/entities/ClickableGreenhouseDoor'
import { ClickableReception } from '../../world/entities/ClickableReception'
import { ClickableTree } from '../../world/entities/ClickableTree'
import { ClickableWorkbench } from '../../world/entities/ClickableWorkbench'
import { ClickableZoe } from '../../world/entities/ClickableZoe'
import { JournalBook } from '../../world/entities/JournalBook'
import { RaspberryMinigame } from '../../world/entities/RaspberryMinigame'
import { AnimatedCharacter } from '../../world/entities/AnimatedCharacter'

const JOURNAL_OFFSET = { x: 0.68, y: 0, z: 1.77 }
const JOURNAL_ROTATION_Y = 0.41

// Greenhouse serre interior world offset — place minigame group at the serre origin.
// Calibrate in dev by reading camera position when inside the serre.
const SERRE_GROUP_POSITION = [24.5, 0, -5.4]
const ZOE_TEXTURE_BASE_PATHS = ['/textures/compressed/', '/textures/']

export function SceneInteractions({
  cabane,
  playerMode,
  postIntro,
  introWaitingAtDoor,
  journalUnlocked,
  receptionActive,
  treePhaseActive,
  workbenchPhaseActive,
  greenhousePhaseActive,
  onWorkbenchInteract,
  onIntroEvent,
  onReceptionInteract,
  onTreeInteract,
  onGreenhouseDoorClick,
  onJournalStart,
  onJournalEnd,
  onJournalOpenComplete,
  onJournalCancel,
  onJournalPiecePlaced,
  journalAutoOpenToken,
  journalCloseToken,
  journalPuzzleEnabled,
  journalVisible = true,
  serreActive,
  zoePhaseActive,
  raspberryPhaseActive,
  juicePhaseActive,
  zoeClip,
  onZoeTalk,
  onMinigameStateChange,
  onUnripeAttempt,
}) {
  const isJournalInteractable = (playerMode || postIntro) && journalUnlocked
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
        isInteractable={receptionActive}
        onInteract={onReceptionInteract}
      />

      <ClickableTree cabane={cabane} isInteractable={treePhaseActive} onInteract={onTreeInteract} />

      <ClickableWorkbench
        cabane={cabane}
        isInteractable={workbenchPhaseActive}
        onInteract={onWorkbenchInteract}
      />

      <ClickableGreenhouseDoor
        cabane={cabane}
        isInteractable={greenhousePhaseActive}
        onDoorClick={onGreenhouseDoorClick}
      />

      {journalVisible && bookPosition && (
        <JournalBook
          position={bookPosition}
          active={isJournalInteractable}
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

      <ClickableZoe isInteractable={zoePhaseActive} onZoeTalk={onZoeTalk} />

      {raspberryPhaseActive && (
        <RaspberryMinigame
          isActive
          position={SERRE_GROUP_POSITION}
          onStateChange={onMinigameStateChange}
          onUnripeAttempt={onUnripeAttempt}
        />
      )}

      {(serreActive || zoePhaseActive || raspberryPhaseActive || juicePhaseActive) && (
        <Suspense fallback={null}>
          <AnimatedCharacter
            url="/models/zoe-animated.glb"
            clip={zoeClip}
            textureName="zoe-animated"
            textureBasePaths={ZOE_TEXTURE_BASE_PATHS}
            position={[26.0, 1.1, -5.4]}
            rotation={[0, -Math.PI / 2, 0]}
            scale={11}
          />
        </Suspense>
      )}
    </>
  )
}
