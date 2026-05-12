import { Suspense, useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { ClickableDoor } from '../../world/entities/ClickableDoor'
import { ClickableJuiceTable } from '../../world/entities/ClickableJuiceTable'
import { ClickableJuiceMachine } from '../../world/entities/ClickableJuiceMachine'
import { JuicePipeFill } from '../../world/entities/JuicePipeFill'
import { ClickableGreenhouseDoor } from '../../world/entities/ClickableGreenhouseDoor'
import { ClickableSerreCorridorDoor } from '../../world/entities/ClickableSerreCorridorDoor'
import { ClickableLadder } from '../../world/entities/ClickableLadder'
import { ClickableStairs } from '../../world/entities/ClickableStairs'
import { ClickableReception } from '../../world/entities/ClickableReception'
import { ClickableTree } from '../../world/entities/ClickableTree'
import { ClickableWorkbench } from '../../world/entities/ClickableWorkbench'
import { ClickableZoe } from '../../world/entities/ClickableZoe'
import { JournalBook } from '../../world/entities/JournalBook'
import { Basket, RaspberryMinigame } from '../../world/entities/RaspberryMinigame'
import { AnimatedCharacter } from '../../world/entities/AnimatedCharacter'
import { publicAssetManifest } from 'virtual:public-asset-manifest'
import { FLOOR_Y } from '../SceneConfig.js'
import { getRegistry, onRegistryChange } from '../cameraRegistry'

const JOURNAL_OFFSET = { x: 0.68, y: 0, z: 1.77 }
// outsideplant03 world pos [32.8189,1.5645,-5.6124] + BASKET_ORIGIN [-0.1,-0.4,0.2]
const BASKET_PREVIEW_POS = [32.7189, 1.1645, -5.4124]
const JOURNAL_ROTATION_Y = 0.41
const compressedModelFiles = new Set(publicAssetManifest.compressedModelFiles)

function resolveCharacterUrl(fileName, performanceMode) {
  const compressedUrl = `/models/compressed/${fileName}`
  if (performanceMode && compressedModelFiles.has(compressedUrl)) {
    return compressedUrl
  }

  return `/models/${fileName}`
}

function getCharacterConfig(id) {
  return getRegistry().characters?.find((character) => character.id === id) ?? null
}

function toPositionArray(character, fallback) {
  const position = character?.position
  if (!position) return fallback
  return [position.x, position.y, position.z]
}

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
  exitSerrePhaseActive,
  ladderClickActive,
  onLadderClick,
  stairsClickActive,
  onStairsClick,
  onStairsHover,
  onWorkbenchInteract,
  onIntroEvent,
  onReceptionInteract,
  onTreeInteract,
  onGreenhouseDoorClick,
  onExitSerreDoorClick,
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
  juiceMachinePhaseActive,
  juicePipePlaying,
  juicePhaseActive,
  zoeClip,
  onZoeTalk,
  onMinigameStateChange,
  onUnripeAttempt,
  onJuiceMachineInteract,
  onJuicePipeComplete,
  onJuiceInteract,
  serrePreview,
  performanceMode,
}) {
  const [characters, setCharacters] = useState(() => getRegistry().characters ?? [])
  const isJournalInteractable = (playerMode || postIntro) && journalUnlocked
  // Keep Zoe's visible mesh on the source GLB and reuse the compressed GLB for animation clips,
  // matching the historical fix that restored her motion after model export changes.
  const zoeUrl = resolveCharacterUrl('zoe-animated.glb', false)
  const textureBasePaths = performanceMode
    ? ['/textures/ktx2/', '/textures/compressed/', '/textures/']
    : ['/textures/ktx2/', '/textures/']
  const zoe = characters.find((character) => character.id === 'zoe') ?? getCharacterConfig('zoe')
  const zoePosition = toPositionArray(zoe, [26.0, FLOOR_Y, -5.4])

  useEffect(() => onRegistryChange((registry) => setCharacters(registry.characters ?? [])), [])

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

      <ClickableSerreCorridorDoor
        cabane={cabane}
        isInteractable={exitSerrePhaseActive}
        onDoorClick={onExitSerreDoorClick}
      />

      <ClickableLadder
        cabane={cabane}
        isInteractable={ladderClickActive}
        onInteract={onLadderClick}
      />

      <ClickableStairs
        cabane={cabane}
        isInteractable={stairsClickActive}
        onInteract={onStairsClick}
        onHover={onStairsHover}
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

      <ClickableZoe isInteractable={zoePhaseActive} position={zoePosition} onZoeTalk={onZoeTalk} />

      <ClickableJuiceMachine
        cabane={cabane}
        isInteractable={juiceMachinePhaseActive}
        onInteract={onJuiceMachineInteract}
      />

      <JuicePipeFill scene={cabane} playing={juicePipePlaying} onComplete={onJuicePipeComplete} />

      <ClickableJuiceTable
        cabane={cabane}
        isInteractable={juicePhaseActive}
        onInteract={onJuiceInteract}
      />

      {raspberryPhaseActive && (
        <RaspberryMinigame
          isActive
          onStateChange={onMinigameStateChange}
          onUnripeAttempt={onUnripeAttempt}
        />
      )}

      {(serreActive ||
        zoePhaseActive ||
        raspberryPhaseActive ||
        juiceMachinePhaseActive ||
        juicePhaseActive ||
        serrePreview) && (
        <Suspense fallback={null}>
          <AnimatedCharacter
            key={zoeUrl}
            url={zoeUrl}
            animationUrl="/models/compressed/zoe-animated.glb"
            clip={zoeClip}
            textureName="zoe-animated"
            textureBasePaths={textureBasePaths}
            position={zoePosition}
            rotation={[0, zoe?.rotationY ?? -Math.PI / 2, 0]}
            scale={zoe?.scale ?? 11}
          />
        </Suspense>
      )}

      {serrePreview && !raspberryPhaseActive && <Basket position={BASKET_PREVIEW_POS} />}
    </>
  )
}
