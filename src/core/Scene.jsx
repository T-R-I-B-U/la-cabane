import { useState, useRef, useCallback, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import AudioManager from './audio/AudioManager'
import { SlidingDoors } from '../world/entities/SlidingDoors'
import { TreeLeaves } from '../world/entities/TreeLeaves'
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
  const { onNpcInteract, onNpcHover, onLeafClick } = interactions

  const [cabane, setCabane] = useState(null)
  const [leafMesh, setLeafMesh] = useState(null)
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

  // Extract the leaf InstancedMesh here (in a callback, not an effect) so mutations
  // happen before the value enters React state — satisfies react-hooks/immutability.
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
      // Safe here: pointer events only fire on mouse move, not every frame.
      delete found.raycast
      // Remove from cabane group so TreeLeaves is the sole owner of this mesh.
      // Without this, the mesh is drawn twice: once inside the cabane group and
      // once via <primitive object={leafMesh} /> in TreeLeaves.
      found.parent?.remove(found)
    }
    setLeafMesh(found ?? null)
  }, [])

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

      <Floor mainFloorRef={setMainFloorCollider} />

      <CabaneMap onReady={handleReady} onError={onError} onCabaneLoaded={handleCabaneLoaded} />

      <TreeLeaves leafMesh={leafMesh} onLeafClick={onLeafClick} />

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
        canMove={player.canMove}
        canRotate={player.canRotate}
        postIntro={postIntro}
        postIntroLocked={postIntroLocked}
        controlsRef={controlsRef}
        hutPosition={hutPosition}
      />
    </Canvas>
  )
}
