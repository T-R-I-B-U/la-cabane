import { useState, useRef, useMemo, Suspense, lazy } from 'react'
import { Canvas } from '@react-three/fiber'
import { initKTX2Loader } from './ktx2Loader.js'
import AudioManager from './audio/AudioManager'
import { Floor } from './Floor'
import { BackgroundPlanes } from '../world/entities/BackgroundPlanes'
import { DEFAULT_HUT_POS } from './SceneConfig'
import { StatsCollector } from './StatsCollector'
import { SceneControls } from './scene/SceneControls'
import { SceneLighting } from './scene/SceneLighting'
import { CabaneScene } from './scene/CabaneScene'
import { useActiveZone } from '../utils/gameManagerStore'

const ArbreScene = lazy(() =>
  import('./scene/ArbreScene').then((mod) => ({ default: mod.ArbreScene }))
)
const WatercolorPass = lazy(() =>
  import('../world/materials/WatercolorPass').then((mod) => ({ default: mod.WatercolorPass }))
)

export default function Scene({
  performanceMode,
  activeHdriId,
  sceneState,
  player,
  debug,
  intro,
  arbre,
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
    spawnTarget: playerSpawnTarget,
    eyeHeight: playerEyeHeight,
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
    exitSerrePhaseActive,
    thomasEtabliPhaseActive,
    thomasAnimPhase,
    interactionLocked,
    onEvent: onIntroEvent,
    onReceptionInteract,
    onTreeInteract,
    onWorkbenchInteract,
    onGreenhouseDoorClick,
    onExitSerreDoorClick,
    onThomasEtabliInteract,
    onStoryCameraTransitionComplete,
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
    cameraFixed,
    serrePreview,
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

  const {
    active: arbreActive,
    storyCameraTransition: arbreStoryCameraTransition,
    onTransitionComplete: onArbreTransitionComplete,
    ladderClickActive,
    stairsClickActive,
    onLadderClick,
    onStairsClick,
    onStairsHover,
    growingFruitPlaying: arbreGrowingFruitPlaying,
    fruitsClickActive,
    onFruitClickDuringLeaves,
    leafInteractionsEnabled: arbreLeafInteractionsEnabled,
  } = arbre

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
      onCreated={({ gl }) => initKTX2Loader(gl)}
    >
      <StatsCollector onStats={onStats} />
      <AudioManager />

      <SceneLighting activeHdriId={activeHdriId} />

      <Floor mainFloorRef={setMainFloorCollider} />
      {/* <BackgroundPlanes hutPosition={hutPosition} /> */}

      {(zone === 'cabane' || zone === 'arbre') && (
        <Suspense fallback={null}>
          <CabaneScene
            performanceMode={performanceMode}
            onError={onError}
            onSceneReady={onReady}
            leafMaterialMode={leafMaterialMode}
            interactionsEnabled={
              zone === 'cabane' ? interactionsEnabled : arbreLeafInteractionsEnabled
            }
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
            exitSerrePhaseActive={exitSerrePhaseActive}
            ladderClickActive={ladderClickActive}
            onLadderClick={onLadderClick}
            stairsClickActive={stairsClickActive}
            onStairsClick={onStairsClick}
            onStairsHover={onStairsHover}
            onGreenhouseDoorClick={onGreenhouseDoorClick}
            onExitSerreDoorClick={onExitSerreDoorClick}
            thomasEtabliPhaseActive={thomasEtabliPhaseActive}
            thomasAnimPhase={thomasAnimPhase}
            onWorkbenchInteract={onWorkbenchInteract}
            onThomasEtabliInteract={onThomasEtabliInteract}
            onTreeInteract={onTreeInteract}
            onReceptionInteract={onReceptionInteract}
            introWaitingAtDoor={introWaitingAtDoor}
            journalUnlocked={journalUnlocked}
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
      )}

      {zone === 'arbre' && (
        <Suspense fallback={null}>
          <ArbreScene
            platformPosition={platformPosition}
            arbreActive={arbreActive}
            growingFruitPlaying={arbreGrowingFruitPlaying}
            fruitsClickActive={fruitsClickActive}
            onFruitClickDuringLeaves={onFruitClickDuringLeaves}
            onFruitClick={onFruitClick}
            onFruitHover={onFruitHover}
            interactionsEnabled={areSceneInteractionsEnabled}
          />
        </Suspense>
      )}

      <SceneControls
        collisionObjects={collisionObjects}
        introActive={introActive}
        introShouldAdvance={introShouldAdvance}
        introSpawn={introSpawn}
        storyCameraTransition={storyCameraTransition}
        onStoryCameraTransitionComplete={onStoryCameraTransitionComplete}
        arbreStoryCameraTransition={arbreStoryCameraTransition}
        onArbreTransitionComplete={onArbreTransitionComplete}
        onIntroEvent={onIntroEvent}
        playerMode={playerMode}
        flyMode={flyMode}
        playerSpawn={playerSpawn}
        playerSpawnTarget={playerSpawnTarget}
        playerEyeHeight={playerEyeHeight}
        playerSpawnKey={playerSpawnKey}
        movementLocked={movementLocked}
        postIntro={postIntro}
        postIntroLocked={postIntroLocked}
        pointerControlsRef={pointerControlsRef}
        controlsRef={controlsRef}
        hutPosition={hutPosition}
        cameraFixed={cameraFixed}
      />

      {shaderEnabled && (
        <Suspense fallback={null}>
          <WatercolorPass radius={shaderRadius} />
        </Suspense>
      )}
    </Canvas>
  )
}
