import { useState, useCallback, useEffect, useRef } from 'react'
import { Crosshair } from './app/Crosshair'
import { IntroLoader } from './app/IntroLoader'
import { NameInput } from './app/NameInput'
import { SavoirPanel } from './app/SavoirPanel'
import { useIntroFlow } from './app/useIntroFlow'
import { useSavoirAssignment } from './app/useSavoirAssignment'
import { ViewerControls } from './app/ViewerControls'
import Scene from './core/Scene'
import IntroCameraPanel from './core/IntroCameraPanel'
import { DEFAULT_HDRI_ID, HDRI_OPTIONS, NO_HDRI_ID } from './core/scene/hdriOptions'
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
  const [activeHdriId, setActiveHdriId] = useState(DEFAULT_HDRI_ID)
  const [showUI, setShowUI] = useState(true)
  const [playerSpawn, setPlayerSpawn] = useState(null)
  const [playerSpawnKey, setPlayerSpawnKey] = useState(0)
  const [userMovementLocked, setUserMovementLocked] = useState(false)
  const [journalActive, setJournalActive] = useState(false)
  const [savoirActive, setSavoirActive] = useState(false)
  const [savoirOpen, setSavoirOpen] = useState(false)
  const pointerControlsRef = useRef(null)

  const {
    selected: selectedSavoir,
    assignAndOpen,
    close: closeSavoirInternal,
  } = useSavoirAssignment()

  const handleLeafClick = useCallback(
    (id) => {
      setSavoirActive(true)
      document.exitPointerLock()
      assignAndOpen(id)
    },
    [assignAndOpen]
  )

  // Open panel only after pointer lock actually releases.
  useEffect(() => {
    if (!savoirActive) return

    if (!document.pointerLockElement) {
      requestAnimationFrame(() => setSavoirOpen(true))
      return
    }
    const onRelease = () => {
      if (!document.pointerLockElement) setSavoirOpen(true)
    }
    document.addEventListener('pointerlockchange', onRelease)
    return () => document.removeEventListener('pointerlockchange', onRelease)
  }, [savoirActive])
  const sceneReady = status === 'ok'
  const {
    dialogueActive,
    introActive,
    introDoorOpen,
    introMovementLocked,
    introSpawn,
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
  const [showCameraEditor, setShowCameraEditor] = useState(false)
  const [liveCam, setLiveCam] = useState(null)
  const [capturedWaypoints, setCapturedWaypoints] = useState(
    Array.from({ length: 5 }, () => ({ position: null, target: null }))
  )
  const handleWaypointCapture = useCallback((i, live) => {
    setCapturedWaypoints((prev) => {
      const next = [...prev]
      next[i] = { position: live.position, target: live.target }
      return next
    })
  }, [])
  const [leafHovered, setLeafHovered] = useState(false)
  const [leafMaterialMode, setLeafMaterialMode] = useState('standard')

  const handleCloseSavoir = () => {
    closeSavoirInternal()
    setSavoirActive(false)
    setSavoirOpen(false)
  }

  const requestScenePointerLock = useCallback(() => {
    if (!(playerMode || postIntro)) return
    pointerControlsRef.current?.lock()
  }, [playerMode, postIntro])

  const interactionLocked =
    dialogueActive ||
    introMovementLocked ||
    showNameInput ||
    selectedSavoir !== null ||
    savoirActive ||
    journalActive
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code === 'F1') {
        event.preventDefault()
        setShowUI((current) => !current)
      } else if (event.code === 'F2') {
        event.preventDefault()
        setShowCameraEditor((current) => !current)
      }
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

    // Request lock immediately on click
    setTimeout(() => {
      const canvas = document.querySelector('canvas')
      if (canvas) canvas.requestPointerLock()
    }, 10)
  }

  const cursorVisible =
    !introActive && !postIntro && (!playerMode || interactionLocked || userMovementLocked)

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
    <main className={`viewer-page${cursorVisible ? ' viewer-page--cursor-visible' : ''}`}>
      <Subtitles />

      <Crosshair
        visible={
          (playerMode || postIntro) &&
          !showNameInput &&
          !selectedSavoir &&
          !savoirActive &&
          !journalActive
        }
        active={leafHovered}
      />

      <Scene
        performanceMode={performanceMode}
        activeHdriId={activeHdriId}
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
          movementLocked: interactionLocked || userMovementLocked,
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
          spawn: introSpawn,
          postIntro,
          postIntroLocked: !showNameInput,
          interactionLocked,
          onEvent: handleIntroEvent,
        }}
        leafMaterialMode={leafMaterialMode}
        pointerControlsRef={pointerControlsRef}
        interactions={{
          onLeafClick: handleLeafClick,
          onLeafHover: setLeafHovered,
          onJournalStart: () => setJournalActive(true),
          onJournalCancel: () => requestScenePointerLock(),
          onJournalEnd: () => {
            setJournalActive(false)
            requestScenePointerLock()
          },
        }}
        shaderEnabled={shaderEnabled}
        shaderRadius={shaderRadius}
        onCameraChange={import.meta.env.DEV ? setLiveCam : undefined}
      />

      {import.meta.env.DEV && showUI && <PerfMonitor stats={stats} scene={info} status={status} />}

      {import.meta.env.DEV && showCameraEditor && !introActive && !playerMode && !postIntro && (
        <IntroCameraPanel
          live={liveCam}
          onCapture={handleWaypointCapture}
          waypoints={capturedWaypoints}
        />
      )}

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
          leafMaterialMode={leafMaterialMode}
          hdriOptions={HDRI_OPTIONS}
          noHdriId={NO_HDRI_ID}
          activeHdriId={activeHdriId}
          onHdriChange={setActiveHdriId}
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
          onLeafMaterialChange={setLeafMaterialMode}
        />
      )}

      {showNameInput && <NameInput onSubmit={handleNameSubmit} />}

      {savoirOpen && selectedSavoir && (
        <SavoirPanel savoir={selectedSavoir.savoir} onClose={handleCloseSavoir} />
      )}

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
