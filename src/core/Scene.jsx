import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PointerLockControls, Environment } from '@react-three/drei'
import { AnimatedCharacter } from '../world/entities/AnimatedCharacter'
import { buildCabane } from '../world/entities/Cabane'
import { SlidingDoors } from '../world/entities/SlidingDoors'
import { ClickableDoor } from '../world/entities/ClickableDoor'
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
  onIntroEvent,
  marieClip,
  thomasClip,
}) {
  const [cabane, setCabane] = useState(null)
  const [hutPosition, setHutPosition] = useState(DEFAULT_HUT_POS)
  const controlsRef = useRef()
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

      <Environment preset="apartment" />
      <ambientLight intensity={1} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />

      <Floor />

      <CabaneMap onReady={handleReady} onError={onError} onCabaneLoaded={setCabane} />

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

      <ClickableDoor
        cabane={cabane}
        active={introWaitingAtDoor}
        onDoorClick={() => onIntroEvent?.('door:clicked')}
      />

      {debugCollisions && <CollisionDebug cabane={cabane} />}

      <SlidingDoors
        cabane={cabane}
        playerMode={playerMode}
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
        <PlayerControls hutPosition={hutPosition} />
      ) : postIntro ? (
        postIntroLocked ? (
          <PointerLockControls />
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
