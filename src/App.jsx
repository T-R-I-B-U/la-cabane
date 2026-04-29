import { useState, useCallback, useEffect } from 'react'
import { Crosshair } from './app/Crosshair'
import { IntroLoader } from './app/IntroLoader'
import JournalOverlay from './app/JournalOverlay'
import { NameInput } from './app/NameInput'
import { useIntroFlow } from './app/useIntroFlow'
import { ViewerControls } from './app/ViewerControls'
import Scene from './core/Scene'
import { getPlatformSpawn, getPlayerSpawn } from './core/SceneConfig'
import { PerfMonitor } from './core/PerfMonitor'
import Subtitles from './core/audio/Subtitles'
import './App.css'

const STATS_INIT = { fps: 0, frameMs: 0, calls: 0, triangles: 0, geometries: 0, textures: 0 }

export default function App() {
  const [stats, setStats] = useState(STATS_INIT)
  const [status, setStatus] = useState('loading')
  const [info, setInfo] = useState(null)
  const [performanceMode, setPerformanceMode] = useState(false)
  const [playerMode, setPlayerMode] = useState(false)
  const [flyMode, setFlyMode] = useState(false)
  const [debugDoors, setDebugDoors] = useState(false)
  const [debugCollisions, setDebugCollisions] = useState(false)
  const [shaderEnabled, setShaderEnabled] = useState(false)
  const [shaderRadius, setShaderRadius] = useState(3)
  const [showUI, setShowUI] = useState(true)
  const [playerSpawn, setPlayerSpawn] = useState(null)
  const [playerSpawnKey, setPlayerSpawnKey] = useState(0)
  const [userMovementLocked, setUserMovementLocked] = useState(false)
  const [journalOpen, setJournalOpen] = useState(false)
  const [journalBounds, setJournalBounds] = useState(null)
  const [journalActive, setJournalActive] = useState(false)
  const onJournalStart = useCallback(() => {
    setJournalActive(true)
    document.exitPointerLock()
  }, [])
  const onJournalOpen = useCallback((bounds) => {
    setJournalBounds(bounds)
    setJournalOpen(true)
  }, [])
  const sceneReady = status === 'ok'
  const {
    dialogueActive,
    introActive,
    introDoorOpen,
    introMovementLocked,
    introPending,
    introShouldAdvance,
    introWaitingAtDoor,
    loaderFading,
    postIntro,
    showNameInput,
    dismissLoader,
    handleIntroEvent,
    handleLoaderClick,
    handleLoaderKeyDown,
    handleNameSubmit,
    launchIntro,
    setPostIntro,
  } = useIntroFlow({ sceneReady })
  const interactionLocked = dialogueActive || introMovementLocked || showNameInput || journalActive
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code !== 'F1') return

      event.preventDefault()
      setShowUI((current) => !current)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const onReady = useCallback((data) => {
    setInfo(data)
    setStatus('ok')
  }, [])
  const onError = useCallback((msg) => {
    setInfo(msg)
    setStatus('error')
  }, [])

  function goToPlatform() {
    setPostIntro(false)
    setPlayerSpawn(getPlatformSpawn(info?.platformPosition))
    setPlayerSpawnKey((k) => k + 1)
    setUserMovementLocked(true)
    setPlayerMode(true)
    setFlyMode(false)
  }

  function togglePlayerView() {
    setPostIntro(false)

    if (playerMode) {
      setPlayerMode(false)
      setFlyMode(false)
      setUserMovementLocked(false)
      return
    }

    setPlayerSpawn(getPlayerSpawn(info?.hutPosition))
    setPlayerSpawnKey((k) => k + 1)
    setUserMovementLocked(false)
    setPlayerMode(true)
    setFlyMode(false)
  }

  return (
    <main className="viewer-page">
      <Subtitles />

      <Crosshair visible={(playerMode || postIntro) && !showNameInput} active={false} />

      <Scene
        performanceMode={performanceMode}
        sceneState={{
          onStats: setStats,
          onReady,
          onError,
        }}
        player={{
          mode: playerMode,
          flyMode,
          spawn: playerSpawn,
          spawnKey: playerSpawnKey,
          movementLocked: introMovementLocked || userMovementLocked || journalActive,
        }}
        debug={{
          doors: debugDoors,
          collisions: debugCollisions,
        }}
        intro={{
          active: introActive,
          doorOpen: introDoorOpen,
          waitingAtDoor: introWaitingAtDoor,
          shouldAdvance: introShouldAdvance,
          postIntro,
          postIntroLocked: !showNameInput,
          interactionLocked,
          onEvent: handleIntroEvent,
        }}
        interactions={{
          journalOpen,
          onJournalStart,
          onJournalOpen,
        }}
        shaderEnabled={shaderEnabled}
        shaderRadius={shaderRadius}
      />

      {import.meta.env.DEV && showUI && <PerfMonitor stats={stats} scene={info} status={status} />}

      {showUI && !introPending && !introActive && !postIntro && (
        <ViewerControls
          status={status}
          info={info}
          sceneReady={sceneReady}
          performanceMode={performanceMode}
          introPending={introPending}
          introActive={introActive}
          playerMode={playerMode}
          flyMode={flyMode}
          userMovementLocked={userMovementLocked}
          debugDoors={debugDoors}
          debugCollisions={debugCollisions}
          onTogglePerformanceMode={() => setPerformanceMode((current) => !current)}
          onLaunchIntro={launchIntro}
          onTogglePlayerMode={togglePlayerView}
          onGoToPlatform={goToPlatform}
          onToggleFlyMode={() => setFlyMode((current) => !current)}
          onToggleUserMovement={() => setUserMovementLocked((locked) => !locked)}
          shaderEnabled={shaderEnabled}
          shaderRadius={shaderRadius}
          onToggleShader={() => setShaderEnabled((current) => !current)}
          onShaderRadiusChange={setShaderRadius}
          onToggleDebugDoors={() => setDebugDoors((current) => !current)}
          onToggleDebugCollisions={() => setDebugCollisions((current) => !current)}
        />
      )}

      {journalOpen && journalBounds && (
        <JournalOverlay
          leftBounds={journalBounds.left}
          rightBounds={journalBounds.right}
          onClose={() => {
            setJournalOpen(false)
            setJournalActive(false)
          }}
        />
      )}

      {showNameInput && <NameInput onSubmit={handleNameSubmit} />}

      {introPending && (
        <IntroLoader
          fading={loaderFading}
          onClick={handleLoaderClick}
          onKeyDown={handleLoaderKeyDown}
          onAnimationEnd={dismissLoader}
        />
      )}
    </main>
  )
}
