import { useState, useRef, useCallback, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import AudioManager from './audio/AudioManager'
import { SlidingDoors } from '../world/entities/SlidingDoors'
import { CollisionDebug } from './CollisionDebug'
import { Floor } from './Floor'
import { DEFAULT_HUT_POS } from './SceneConfig'
import { StatsCollector } from './StatsCollector'
import { CabaneMap } from './scene/CabaneMap'
import { SceneCharacters } from './scene/SceneCharacters'
import { SceneControls } from './scene/SceneControls'
import { SceneInteractions } from './scene/SceneInteractions'
import { SceneLighting } from './scene/SceneLighting'

export default function Scene({ sceneState, player, debug, intro, characters, interactions }) {
  const { onStats, onReady, onError } = sceneState
  const { mode: playerMode, spawn: playerSpawn, spawnKey: playerSpawnKey, movementLocked } = player
  const { doors: debugDoors, collisions: debugCollisions } = debug
  const {
    active: introActive,
    doorOpen: introDoorOpen,
    waitingAtDoor: introWaitingAtDoor,
    shouldAdvance: introShouldAdvance,
    postIntro,
    postIntroLocked,
    interactionLocked,
    onEvent: onIntroEvent,
  } = intro
  const { marieClip, thomasClip } = characters
  const { onNpcInteract, onNpcHover } = interactions

  const [cabane, setCabane] = useState(null)
  const [hutPosition, setHutPosition] = useState(DEFAULT_HUT_POS)
  const [mainFloorCollider, setMainFloorCollider] = useState(null)
  const controlsRef = useRef()
  const firstPersonMode = playerMode || (postIntro && postIntroLocked)
  const collisionObjects = useMemo(
    () => [cabane, mainFloorCollider].filter(Boolean),
    [cabane, mainFloorCollider]
  )
  const handleReady = useCallback(
    (data) => {
      if (Array.isArray(data.hutPosition)) setHutPosition(data.hutPosition)
      onReady(data)
    },
    [onReady]
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

      <SceneLighting />

      <Floor mainFloorRef={setMainFloorCollider} hutPosition={hutPosition} />

      <CabaneMap onReady={handleReady} onError={onError} onCabaneLoaded={setCabane} />

      <SceneCharacters hutPosition={hutPosition} marieClip={marieClip} thomasClip={thomasClip} />

      <SceneInteractions
        cabane={cabane}
        hutPosition={hutPosition}
        playerMode={playerMode}
        postIntro={postIntro}
        interactionLocked={interactionLocked}
        introWaitingAtDoor={introWaitingAtDoor}
        onIntroEvent={onIntroEvent}
        onNpcInteract={onNpcInteract}
        onNpcHover={onNpcHover}
      />

      {debugCollisions && <CollisionDebug cabane={cabane} />}

      <SlidingDoors
        cabane={cabane}
        firstPersonMode={firstPersonMode}
        controlsRef={controlsRef}
        debug={debugDoors}
        forceOpen={introDoorOpen}
      />

      <SceneControls
        collisionObjects={collisionObjects}
        introActive={introActive}
        introShouldAdvance={introShouldAdvance}
        onIntroEvent={onIntroEvent}
        playerMode={playerMode}
        playerSpawn={playerSpawn}
        playerSpawnKey={playerSpawnKey}
        movementLocked={movementLocked}
        postIntro={postIntro}
        postIntroLocked={postIntroLocked}
        controlsRef={controlsRef}
        hutPosition={hutPosition}
      />
    </Canvas>
  )
}
