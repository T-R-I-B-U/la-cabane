import { useState, useRef, useMemo, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import AudioManager from './audio/AudioManager'
import { WatercolorPass } from '../world/materials/WatercolorPass'
import { GrowingFruit } from '../world/entities/GrowingFruit'
import { Fruit } from '../world/entities/Fruit'
import { Floor } from './Floor'
import { BackgroundPlanes } from '../world/entities/BackgroundPlanes'
import { DEFAULT_HUT_POS } from './SceneConfig'
import { StatsCollector } from './StatsCollector'
import { SceneControls } from './scene/SceneControls'
import { SceneLighting } from './scene/SceneLighting'
import { CabaneScene } from './scene/CabaneScene'
import { ArbreScene } from './scene/ArbreScene'
import { useActiveZone } from '../utils/gameManagerStore'

export default function Scene({
  performanceMode,
  activeHdriId,
  sceneState,
  player,
  debug,
  intro,
  leafMaterialMode,
  interactionsEnabled,
  pointerControlsRef,
  interactions,
  shaderEnabled,
  shaderRadius,
  journalAutoOpenToken,
  journalCloseToken,
  journalPuzzleEnabled,
}) {
  const { onStats, onReady, onError } = sceneState
  const {
    mode: playerMode,
    flyMode,
    spawn: playerSpawn,
    spawnKey: playerSpawnKey,
    movementLocked,
  } = player
  const { doors: debugDoors, collisions: debugCollisions } = debug
  const {
    active: introActive,
    doorOpen: introDoorOpen,
    waitingAtDoor: introWaitingAtDoor,
    shouldAdvance: introShouldAdvance,
    journalUnlocked,
    spawn: introSpawn,
    storyCameraTransition,
    postIntro,
    postIntroLocked,
    receptionActive,
    treePhaseActive,
    workbenchPhaseActive,
    greenhousePhaseActive,
    thomasEtabliPhaseActive,
    thomasAnimPhase,
    interactionLocked,
    onEvent: onIntroEvent,
    onReceptionInteract,
    onTreeInteract,
    onWorkbenchInteract,
    onGreenhouseDoorClick,
    onThomasEtabliInteract,
    onStoryCameraTransitionComplete,
  } = intro
  const {
    onLeafClick,
    onLeafHover,
    onFruitClick,
    onFruitHover,
    onJournalStart,
    onJournalEnd,
    onJournalOpenComplete,
    onJournalCancel,
    onJournalPiecePlaced,
  } = interactions

  const zone = useActiveZone()
  const [sceneColliders, setSceneColliders] = useState([])
  const [mainFloorCollider, setMainFloorCollider] = useState(null)
  const [hutPosition, setHutPosition] = useState(DEFAULT_HUT_POS)
  const [platformPosition, setPlatformPosition] = useState(null)
  const controlsRef = useRef()
  const firstPersonMode = playerMode || (postIntro && postIntroLocked)
  const areSceneInteractionsEnabled =
    (playerMode || postIntro) && !interactionLocked && interactionsEnabled
  const collisionObjects = useMemo(
    () => [...sceneColliders, mainFloorCollider].filter(Boolean),
    [sceneColliders, mainFloorCollider]
  )

  return (
    <Canvas
      camera={{
        fov: 60,
        near: 0.01,
        far: 500,
        position: [DEFAULT_HUT_POS[0] + 22, DEFAULT_HUT_POS[1] + 14, DEFAULT_HUT_POS[2] + 28],
      }}
      shadows
    >
      <StatsCollector onStats={onStats} />
      <AudioManager />

      <SceneLighting activeHdriId={activeHdriId} />

      <Floor mainFloorRef={setMainFloorCollider} hutPosition={hutPosition} />
      <BackgroundPlanes hutPosition={hutPosition} />

      <Suspense fallback={null}>
        <CabaneScene
          performanceMode={performanceMode}
          onError={onError}
          onSceneReady={onReady}
          leafMaterialMode={leafMaterialMode}
          interactionsEnabled={interactionsEnabled}
          onLeafClick={onLeafClick}
          onLeafHover={onLeafHover}
          onJournalStart={onJournalStart}
          onJournalEnd={onJournalEnd}
          onJournalOpenComplete={onJournalOpenComplete}
          onJournalCancel={onJournalCancel}
          onJournalPiecePlaced={onJournalPiecePlaced}
          onIntroEvent={onIntroEvent}
          receptionActive={receptionActive}
          treePhaseActive={treePhaseActive}
          workbenchPhaseActive={workbenchPhaseActive}
          greenhousePhaseActive={greenhousePhaseActive}
          onGreenhouseDoorClick={onGreenhouseDoorClick}
          thomasEtabliPhaseActive={thomasEtabliPhaseActive}
          thomasAnimPhase={thomasAnimPhase}
          onWorkbenchInteract={onWorkbenchInteract}
          onThomasEtabliInteract={onThomasEtabliInteract}
          onTreeInteract={onTreeInteract}
          onReceptionInteract={onReceptionInteract}
          introWaitingAtDoor={introWaitingAtDoor}
          journalUnlocked={journalUnlocked}
          playerMode={playerMode}
          postIntro={postIntro}
          postIntroLocked={postIntroLocked}
          interactionLocked={interactionLocked}
          debugDoors={debugDoors}
          debugCollisions={debugCollisions}
          journalAutoOpenToken={journalAutoOpenToken}
          journalCloseToken={journalCloseToken}
          journalPuzzleEnabled={journalPuzzleEnabled}
          forceOpenDoor={introDoorOpen}
          controlsRef={controlsRef}
          firstPersonMode={firstPersonMode}
          platformPosition={platformPosition}
          onCollisionReady={setSceneColliders}
          onHutPositionReady={setHutPosition}
          onPlatformPositionReady={setPlatformPosition}
        />
      </Suspense>

      {zone === 'arbre' && (
        <Suspense fallback={null}>
          <ArbreScene platformPosition={platformPosition} />
        </Suspense>
      )}

      <GrowingFruit />

      <Fruit
        fruitId="fruit_01"
        position={[-23, 25.5, -9]}
        active={areSceneInteractionsEnabled}
        onFruitClick={onFruitClick}
        onFruitHover={onFruitHover}
      />

      <SceneControls
        collisionObjects={collisionObjects}
        introActive={introActive}
        introShouldAdvance={introShouldAdvance}
        introSpawn={introSpawn}
        storyCameraTransition={storyCameraTransition}
        onStoryCameraTransitionComplete={onStoryCameraTransitionComplete}
        onIntroEvent={onIntroEvent}
        playerMode={playerMode}
        flyMode={flyMode}
        playerSpawn={playerSpawn}
        playerSpawnKey={playerSpawnKey}
        movementLocked={movementLocked}
        postIntro={postIntro}
        postIntroLocked={postIntroLocked}
        pointerControlsRef={pointerControlsRef}
        controlsRef={controlsRef}
        hutPosition={hutPosition}
      />

      {shaderEnabled && <WatercolorPass radius={shaderRadius} />}
    </Canvas>
  )
}
