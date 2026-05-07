import { useState, useEffect, useCallback } from 'react'
import { CabaneMap } from './CabaneMap'
import { TreeLeaves } from '../../world/entities/TreeLeaves'
import { SceneCharacters } from './SceneCharacters'
import { SceneInteractions } from './SceneInteractions'
import { SlidingDoors } from '../../world/entities/SlidingDoors'
import { CollisionDebug } from '../CollisionDebug'
import { TriggerZone } from '../../world/interactions/TriggerZone'
import { setZone, useVisibilityZones, applyVisibilityZone, getZoneComponents } from '../../utils'
import { PLATFORM_POS } from '../SceneConfig'

// Radius around the tree platform that triggers the arbre zone.
// Tune once the full arbre scene geometry is known.
const ARBRE_TRIGGER_RADIUS = 10

export function CabaneScene({
  performanceMode,
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
  onTreeInteract,
  workbenchPhaseActive,
  onWorkbenchInteract,
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
  onCollisionReady,
  onHutPositionReady,
}) {
  const [cabane, setCabane] = useState(null)
  const [leafMesh, setLeafMesh] = useState(null)
  const visibilityZones = useVisibilityZones()
  const { characters, leaves, journal } = getZoneComponents(visibilityZones)

  useEffect(() => {
    if (!cabane) return
    onCollisionReady?.([cabane])
    return () => onCollisionReady?.([])
  }, [cabane, onCollisionReady])

  useEffect(() => {
    applyVisibilityZone(cabane, visibilityZones)
  }, [cabane, visibilityZones])

  const handleReady = useCallback(
    (data) => {
      if (Array.isArray(data.hutPosition)) {
        onHutPositionReady?.(data.hutPosition)
      }
      onSceneReady?.(data)
    },
    [onHutPositionReady, onSceneReady]
  )

  const handleCabaneLoaded = useCallback((group) => {
    setCabane(group)
    if (!group) {
      setLeafMesh(null)
      return
    }
    let found = null
    group.traverse((obj) => {
      if (!found && obj.isInstancedMesh && obj.name === 'leaf') found = obj
    })
    if (found) {
      // Restore prototype raycast (was disabled in buildInstancedMesh for first-person perf).
      delete found.raycast
      // Remove from cabane group so TreeLeaves is the sole owner of this mesh.
      found.parent?.remove(found)
    }
    setLeafMesh(found ?? null)
  }, [])

  const interactionsActive = (playerMode || postIntro) && !interactionLocked && interactionsEnabled

  return (
    <>
      <CabaneMap
        performanceMode={performanceMode}
        onReady={handleReady}
        onError={onError}
        onCabaneLoaded={handleCabaneLoaded}
      />

      {leaves && (
        <TreeLeaves
          leafMesh={leafMesh}
          active={interactionsActive}
          onLeafClick={onLeafClick}
          onLeafHover={onLeafHover}
          leafMaterialMode={leafMaterialMode}
        />
      )}

      {characters && (
        <SceneCharacters
          performanceMode={performanceMode}
          thomasEtabliPhaseActive={thomasEtabliPhaseActive}
          onThomasEtabliInteract={onThomasEtabliInteract}
          thomasAnimPhase={thomasAnimPhase}
        />
      )}

      <SceneInteractions
        cabane={cabane}
        playerMode={playerMode}
        postIntro={postIntro}
        interactionLocked={interactionLocked}
        introWaitingAtDoor={introWaitingAtDoor}
        receptionActive={receptionActive}
        journalUnlocked={journalUnlocked}
        onIntroEvent={onIntroEvent}
        onReceptionInteract={onReceptionInteract}
        treePhaseActive={treePhaseActive}
        onTreeInteract={onTreeInteract}
        workbenchPhaseActive={workbenchPhaseActive}
        onWorkbenchInteract={onWorkbenchInteract}
        onJournalStart={onJournalStart}
        onJournalEnd={onJournalEnd}
        onJournalOpenComplete={onJournalOpenComplete}
        onJournalCancel={onJournalCancel}
        onJournalPiecePlaced={onJournalPiecePlaced}
        journalAutoOpenToken={journalAutoOpenToken}
        journalCloseToken={journalCloseToken}
        journalPuzzleEnabled={journalPuzzleEnabled}
        journalVisible={journal}
      />

      {debugCollisions && <CollisionDebug cabane={cabane} />}

      <SlidingDoors
        cabane={cabane}
        firstPersonMode={firstPersonMode}
        controlsRef={controlsRef}
        debug={debugDoors}
        forceOpen={forceOpenDoor}
      />

      <TriggerZone
        center={PLATFORM_POS}
        radius={ARBRE_TRIGGER_RADIUS}
        onEnter={() => setZone('arbre')}
      />
    </>
  )
}
