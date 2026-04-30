import { useState, useRef, useMemo, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import AudioManager from './audio/AudioManager'
import { WatercolorPass } from '../world/materials/WatercolorPass'
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
  interactions,
  shaderEnabled,
  shaderRadius,
  onCameraChange,
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
    spawn: introSpawn,
    postIntro,
    postIntroLocked,
    interactionLocked,
    onEvent: onIntroEvent,
  } = intro
  const { onLeafClick, onLeafHover, onJournalStart, onJournalEnd } = interactions

  const zone = useActiveZone()
  const [sceneColliders, setSceneColliders] = useState([])
  const [mainFloorCollider, setMainFloorCollider] = useState(null)
  const [hutPosition, setHutPosition] = useState(DEFAULT_HUT_POS)
  const controlsRef = useRef()
  const firstPersonMode = playerMode || (postIntro && postIntroLocked)
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

      {zone === 'cabane' && (
        <Suspense fallback={null}>
          <CabaneScene
            performanceMode={performanceMode}
            onError={onError}
            onSceneReady={onReady}
            leafMaterialMode={leafMaterialMode}
            onLeafClick={onLeafClick}
            onLeafHover={onLeafHover}
            onJournalStart={onJournalStart}
            onJournalEnd={onJournalEnd}
            onIntroEvent={onIntroEvent}
            introWaitingAtDoor={introWaitingAtDoor}
            playerMode={playerMode}
            postIntro={postIntro}
            postIntroLocked={postIntroLocked}
            interactionLocked={interactionLocked}
            debugDoors={debugDoors}
            debugCollisions={debugCollisions}
            forceOpenDoor={introDoorOpen}
            controlsRef={controlsRef}
            firstPersonMode={firstPersonMode}
            onCollisionReady={setSceneColliders}
            onHutPositionReady={setHutPosition}
          />
        </Suspense>
      )}

      {zone === 'arbre' && (
        <Suspense fallback={null}>
          <ArbreScene onCollisionReady={setSceneColliders} />
        </Suspense>
      )}

      <SceneControls
        collisionObjects={collisionObjects}
        introActive={introActive}
        introShouldAdvance={introShouldAdvance}
        introSpawn={introSpawn}
        onIntroEvent={onIntroEvent}
        playerMode={playerMode}
        flyMode={flyMode}
        playerSpawn={playerSpawn}
        playerSpawnKey={playerSpawnKey}
        movementLocked={movementLocked}
        postIntro={postIntro}
        postIntroLocked={postIntroLocked}
        controlsRef={controlsRef}
        hutPosition={hutPosition}
        onCameraChange={onCameraChange}
      />

      {shaderEnabled && <WatercolorPass radius={shaderRadius} />}
    </Canvas>
  )
}
