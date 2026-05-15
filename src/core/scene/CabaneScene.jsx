import { useState, useEffect, useCallback } from 'react'
import { CabaneMap } from './CabaneMap'
import { TreeLeaves } from '../../world/entities/TreeLeaves'
import { SceneCharacters } from './SceneCharacters'
import { SceneInteractions } from './SceneInteractions'
import { SlidingDoors } from '../../world/entities/SlidingDoors'
import { CollisionDebug } from '../CollisionDebug'
import { TriggerZone } from '../../world/interactions/TriggerZone'
import { setZone } from '../../utils/gameManagerStore'
import { PLATFORM_POS } from '../SceneConfig'

const ARBRE_TRIGGER_RADIUS = 10

export function CabaneScene({
  modelQuality,
  onError,
  onSceneReady,
  leafMaterialMode,
  interactionsEnabled,
  onLeafClick,
  onLeafHover,
  onJournalStart,
  onJournalEnd,
  onJournalOpenComplete,
  onJournalCancel,
  onJournalPiecePlaced,
  onIntroEvent,
  receptionActive,
  onReceptionInteract,
  treePhaseActive,
  timeatmPhaseActive,
  onTreeInteract,
  onTimeatmInteract,
  workbenchPhaseActive,
  onWorkbenchInteract,
  greenhousePhaseActive,
  exitSerrePhaseActive,
  ladderClickActive,
  onLadderClick,
  stairsClickActive,
  onStairsClick,
  onStairsHover,
  onGreenhouseDoorClick,
  onExitSerreDoorClick,
  thomasEtabliPhaseActive,
  onThomasEtabliInteract,
  thomasAnimPhase,
  introWaitingAtDoor,
  journalUnlocked,
  playerMode,
  postIntro,
  interactionLocked,
  debugDoors,
  debugCollisions,
  journalAutoOpenToken,
  journalCloseToken,
  journalPuzzleEnabled,
  forceOpenDoor,
  controlsRef,
  firstPersonMode,
  platformPosition,
  onCollisionReady,
  onHutPositionReady,
  onPlatformPositionReady,
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
}) {
  const [cabaneGroup, setCabaneGroup] = useState(null)
  const [leafMesh, setLeafMesh] = useState(null)

  useEffect(() => {
    if (!cabaneGroup) return
    onCollisionReady?.([cabaneGroup])
    return () => onCollisionReady?.([])
  }, [cabaneGroup, onCollisionReady])

  const handleCabaneMapReady = useCallback(
    (sceneInfo) => {
      if (Array.isArray(sceneInfo.hutPosition)) {
        onHutPositionReady?.(sceneInfo.hutPosition)
      }
      if (Array.isArray(sceneInfo.platformPosition)) {
        onPlatformPositionReady?.(sceneInfo.platformPosition)
      }
      onSceneReady?.(sceneInfo)
    },
    [onHutPositionReady, onPlatformPositionReady, onSceneReady]
  )

  const handleCabaneGroupLoaded = useCallback((group) => {
    setCabaneGroup(group)
    if (!group) {
      setLeafMesh(null)
      return
    }

    let leafInstancedMesh = null
    group.traverse((object) => {
      if (!leafInstancedMesh && object.isInstancedMesh && object.name === 'leaf') {
        leafInstancedMesh = object
      }
    })
    if (leafInstancedMesh) {
      // Restore prototype raycast (was disabled in buildInstancedMesh for first-person perf).
      delete leafInstancedMesh.raycast
      // Remove from cabane group so TreeLeaves is the sole owner of this mesh.
      leafInstancedMesh.parent?.remove(leafInstancedMesh)
    }
    setLeafMesh(leafInstancedMesh ?? null)
  }, [])

  const areCabaneInteractionsEnabled =
    (playerMode || postIntro) && !interactionLocked && interactionsEnabled

  return (
    <>
      <CabaneMap
        modelQuality={modelQuality}
        modelQuality={modelQuality}
        onReady={handleCabaneMapReady}
        onError={onError}
        onCabaneLoaded={handleCabaneGroupLoaded}
      />

      <TreeLeaves
        leafMesh={leafMesh}
        active={areCabaneInteractionsEnabled}
        onLeafClick={onLeafClick}
        onLeafHover={onLeafHover}
        leafMaterialMode={leafMaterialMode}
      />

      <SceneCharacters
        modelQuality={modelQuality}
        thomasEtabliPhaseActive={thomasEtabliPhaseActive}
        onThomasEtabliInteract={onThomasEtabliInteract}
        thomasAnimPhase={thomasAnimPhase}
      />

      <SceneInteractions
        cabane={cabaneGroup}
        playerMode={playerMode}
        postIntro={postIntro}
        interactionLocked={interactionLocked}
        introWaitingAtDoor={introWaitingAtDoor}
        receptionActive={receptionActive}
        journalUnlocked={journalUnlocked}
        onIntroEvent={onIntroEvent}
        onReceptionInteract={onReceptionInteract}
        treePhaseActive={treePhaseActive}
        timeatmPhaseActive={timeatmPhaseActive}
        onTreeInteract={onTreeInteract}
        onTimeatmInteract={onTimeatmInteract}
        workbenchPhaseActive={workbenchPhaseActive}
        onWorkbenchInteract={onWorkbenchInteract}
        greenhousePhaseActive={greenhousePhaseActive}
        exitSerrePhaseActive={exitSerrePhaseActive}
        ladderClickActive={ladderClickActive}
        onLadderClick={onLadderClick}
        stairsClickActive={stairsClickActive}
        onStairsClick={onStairsClick}
        onStairsHover={onStairsHover}
        onGreenhouseDoorClick={onGreenhouseDoorClick}
        onExitSerreDoorClick={onExitSerreDoorClick}
        serreActive={serreActive}
        zoePhaseActive={zoePhaseActive}
        raspberryPhaseActive={raspberryPhaseActive}
        juiceMachinePhaseActive={juiceMachinePhaseActive}
        juicePipePlaying={juicePipePlaying}
        juicePhaseActive={juicePhaseActive}
        zoeClip={zoeClip}
        onZoeTalk={onZoeTalk}
        onMinigameStateChange={onMinigameStateChange}
        onUnripeAttempt={onUnripeAttempt}
        onJuiceMachineInteract={onJuiceMachineInteract}
        onJuicePipeComplete={onJuicePipeComplete}
        onJuiceInteract={onJuiceInteract}
        serrePreview={serrePreview}
        modelQuality={modelQuality}
        onJournalStart={onJournalStart}
        onJournalEnd={onJournalEnd}
        onJournalOpenComplete={onJournalOpenComplete}
        onJournalCancel={onJournalCancel}
        onJournalPiecePlaced={onJournalPiecePlaced}
        journalAutoOpenToken={journalAutoOpenToken}
        journalCloseToken={journalCloseToken}
        journalPuzzleEnabled={journalPuzzleEnabled}
      />

      {debugCollisions && <CollisionDebug cabane={cabaneGroup} />}

      <SlidingDoors
        cabane={cabaneGroup}
        firstPersonMode={firstPersonMode}
        controlsRef={controlsRef}
        debug={debugDoors}
        forceOpen={forceOpenDoor}
      />

      <TriggerZone
        center={platformPosition ?? PLATFORM_POS}
        radius={ARBRE_TRIGGER_RADIUS}
        onEnter={() => setZone('arbre')}
      />
    </>
  )
}
