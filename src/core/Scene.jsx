import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PointerLockControls, Environment } from '@react-three/drei'
import AudioManager from './audio/AudioManager'
import { AnimatedCharacter } from '../world/entities/AnimatedCharacter'
import { InteractionPoint } from '../world/entities/InteractionPoint'
import { buildCabane } from '../world/entities/Cabane'
import { SlidingDoors } from '../world/entities/SlidingDoors'
import { ClickableDoor } from '../world/entities/ClickableDoor'
import { TreeLeaves } from '../world/entities/TreeLeaves'
import IntroCamera from '../world/entities/IntroCamera'
import { CollisionDebug } from './CollisionDebug'
import { disposeObject3D } from './disposeObject3D'
import { Floor } from './Floor'
import { PlayerControls } from './PlayerControls'
import { DEFAULT_HUT_POS, FLOOR_Y } from './SceneConfig'
import { StatsCollector } from './StatsCollector'

function CabaneMap({ onReady, onError, onCabaneLoaded }) {
  const [cabane, setCabane] = useState(null)

  useEffect(() => {
    let cancelled = false
    let loadedCabane = null
    buildCabane()
      .then((group) => {
        if (cancelled) {
          disposeObject3D(group)
          return
        }
        loadedCabane = group
        let meshes = 0
        let pivots = 0
        group.traverse((obj) => {
          if (obj === group) return
          if (obj.isMesh) meshes++
          else if (obj.userData.cabaneNode) pivots++
        })
        onReady({ meshes, pivots, hutPosition: group.userData.hutPosition })
        onCabaneLoaded(group)
        setCabane(group)
      })
      .catch((err) => {
        if (cancelled) return
        onError(err.message ?? String(err))
      })
    return () => {
      cancelled = true
      if (loadedCabane) disposeObject3D(loadedCabane)
      onCabaneLoaded(null)
    }
  }, [onReady, onError, onCabaneLoaded])

  if (!cabane) return null
  return <primitive object={cabane} />
}

export default function Scene({
  onStats,
  onReady,
  onError,
  playerMode,
  debugDoors,
  debugCollisions,
  introActive,
  introDoorOpen,
  introWaitingAtDoor,
  introShouldAdvance,
  postIntro,
  postIntroLocked,
  movementLocked,
  interactionLocked,
  onIntroEvent,
  marieClip,
  thomasClip,
  onNpcInteract,
  onNpcHover,
  playerSpawn,
  playerSpawnKey,
}) {
  const [cabane, setCabane] = useState(null)
  const [leafMesh, setLeafMesh] = useState(null)
  const [hutPosition, setHutPosition] = useState(DEFAULT_HUT_POS)
  const controlsRef = useRef()
  const firstPersonMode = playerMode || (postIntro && postIntroLocked)
  // Tracks which NPCs are hovered to emit a single boolean up to App
  const npcHoveredMap = useRef({ marie: false, thomas: false })
  const onMarieHover = useCallback(
    (isHovered) => {
      npcHoveredMap.current.marie = isHovered
      onNpcHover?.(Object.values(npcHoveredMap.current).some(Boolean))
    },
    [onNpcHover]
  )
  const onThomasHover = useCallback(
    (isHovered) => {
      npcHoveredMap.current.thomas = isHovered
      onNpcHover?.(Object.values(npcHoveredMap.current).some(Boolean))
    },
    [onNpcHover]
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

      {/* DEBUG: dark background for leaf hover visibility — remove before ship */}
      <color attach="background" args={['#0d1a2b']} />
      {/* ─────────────────────────────────────────────────────────────────────── */}

      <Environment preset="apartment" />
      <ambientLight intensity={1} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />

      <Floor />

      <CabaneMap onReady={handleReady} onError={onError} onCabaneLoaded={handleCabaneLoaded} />

      <TreeLeaves leafMesh={leafMesh} />

      <Suspense fallback={null}>
        <AnimatedCharacter
          url="/models/marie-animated.glb"
          clip={marieClip}
          position={[hutPosition[0] - 2.4, FLOOR_Y, hutPosition[2] - 8.5]}
          rotation={[0, Math.PI * 0.2, 0]}
          scale={9}
        />
        <AnimatedCharacter
          url="/models/thomas-animated.glb"
          clip={thomasClip}
          position={[hutPosition[0] - 1.1, FLOOR_Y, hutPosition[2] - 8.5]}
          rotation={[0, Math.PI * 1.2, 0]}
          scale={9}
        />
      </Suspense>

      {/* Interaction points in front of each NPC — positions may need tuning once in scene */}
      <InteractionPoint
        position={[hutPosition[0] - 2.4, FLOOR_Y + 0.9, hutPosition[2] - 7.5]}
        active={(playerMode || postIntro) && !interactionLocked}
        onInteract={() => onNpcInteract?.('marie')}
        onHoverChange={onMarieHover}
      />
      <InteractionPoint
        position={[hutPosition[0] - 1.1, FLOOR_Y + 0.9, hutPosition[2] - 7.5]}
        active={(playerMode || postIntro) && !interactionLocked}
        onInteract={() => onNpcInteract?.('thomas')}
        onHoverChange={onThomasHover}
      />

      <ClickableDoor
        cabane={cabane}
        active={introWaitingAtDoor}
        onDoorClick={() => onIntroEvent?.('door:clicked')}
      />

      {debugCollisions && <CollisionDebug cabane={cabane} />}

      <SlidingDoors
        cabane={cabane}
        firstPersonMode={firstPersonMode}
        controlsRef={controlsRef}
        debug={debugDoors}
        forceOpen={introDoorOpen}
      />

      {introActive ? (
        <IntroCamera
          active={introActive}
          shouldAdvance={introShouldAdvance}
          onEvent={onIntroEvent}
        />
      ) : playerMode ? (
        <PlayerControls key={playerSpawnKey} canMove={!movementLocked} spawnAt={playerSpawn} />
      ) : postIntro ? (
        postIntroLocked ? (
          <PlayerControls canMove={!movementLocked} />
        ) : null
      ) : (
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.08}
          minDistance={0.5}
          maxDistance={200}
          target={hutPosition}
        />
      )}
    </Canvas>
  )
}
