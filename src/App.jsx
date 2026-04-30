import { useState, useCallback, useEffect, useRef } from 'react'
import { Crosshair } from './app/Crosshair'
import { IntroLoader } from './app/IntroLoader'
import JournalOverlay from './app/JournalOverlay'
import { NameInput } from './app/NameInput'
import { SavoirPanel } from './app/SavoirPanel'
import { ContactPanel } from './app/ContactPanel'
import { useIntroFlow } from './app/useIntroFlow'
import { useSavoirAssignment } from './app/useSavoirAssignment'
import { useContactAssignment } from './app/useContactAssignment'
import { ViewerControls } from './app/ViewerControls'
import Scene from './core/Scene'
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
  const [journalOpen, setJournalOpen] = useState(false)
  const [journalBounds, setJournalBounds] = useState(null)
  const [journalActive, setJournalActive] = useState(false)
  const [savoirActive, setSavoirActive] = useState(false)
  const [savoirOpen, setSavoirOpen] = useState(false)
  const [contactActive, setContactActive] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [leafHovered, setLeafHovered] = useState(false)
  const [fruitHovered, setFruitHovered] = useState(false)
  const [interactionsEnabled, setInteractionsEnabled] = useState(false)
  const pointerControlsRef = useRef(null)

  const {
    selected: selectedSavoir,
    assignAndOpen,
    close: closeSavoirInternal,
  } = useSavoirAssignment()
  const {
    selected: selectedContact,
    openContact,
    close: closeContactInternal,
  } = useContactAssignment()

  const onJournalStart = useCallback(() => {
    setJournalActive(true)
    document.exitPointerLock()
  }, [])
  const onJournalOpen = useCallback((bounds) => {
    setJournalBounds(bounds)
    setJournalOpen(true)
  }, [])

  const handleLeafClick = useCallback(
    (id) => {
      setSavoirActive(true)
      document.exitPointerLock()
      assignAndOpen(id)
    },
    [assignAndOpen]
  )

  const handleFruitClick = useCallback(
    (fruitId) => {
      setContactActive(true)
      document.exitPointerLock()
      openContact(fruitId)
    },
    [openContact]
  )

  const handleFruitHover = useCallback((hovered) => {
    setFruitHovered(hovered)
  }, [])

  const handleToggleInteractionsEnabled = useCallback(() => {
    setInteractionsEnabled((current) => {
      if (current) {
        setLeafHovered(false)
        setFruitHovered(false)
      }
      return !current
    })
  }, [])

  // Open panel only after pointer lock actually releases — same timing guarantee
  // as the journal (which waits for its 3D animation to complete before showing the overlay).
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

  useEffect(() => {
    if (!contactActive) return
    if (!document.pointerLockElement) {
      requestAnimationFrame(() => setContactOpen(true))
      return
    }
    const onRelease = () => {
      if (!document.pointerLockElement) setContactOpen(true)
    }
    document.addEventListener('pointerlockchange', onRelease)
    return () => document.removeEventListener('pointerlockchange', onRelease)
  }, [contactActive])
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
  const [leafMaterialMode, setLeafMaterialMode] = useState('standard') // 'standard', 'physical', 'emissive'

  const requestScenePointerLock = useCallback(() => {
    if (!(playerMode || postIntro)) return
    pointerControlsRef.current?.lock()
  }, [playerMode, postIntro])

  const handleCloseSavoir = useCallback(() => {
    closeSavoirInternal()
    setSavoirActive(false)
    setSavoirOpen(false)
    requestScenePointerLock()
  }, [closeSavoirInternal, requestScenePointerLock])

  const handleCloseContact = useCallback(() => {
    closeContactInternal()
    setContactActive(false)
    setContactOpen(false)
    requestScenePointerLock()
  }, [closeContactInternal, requestScenePointerLock])

  const interactionLocked =
    dialogueActive ||
    introMovementLocked ||
    showNameInput ||
    selectedSavoir !== null ||
    savoirActive ||
    selectedContact !== null ||
    contactActive ||
    journalActive
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
          !selectedContact &&
          !contactActive &&
          !journalActive
        }
          active={interactionsEnabled && (leafHovered || fruitHovered)}
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
          postIntro,
          postIntroLocked: !showNameInput,
          interactionLocked,
          onEvent: handleIntroEvent,
        }}
        leafMaterialMode={leafMaterialMode}
        interactionsEnabled={interactionsEnabled}
        pointerControlsRef={pointerControlsRef}
        interactions={{
          onLeafClick: handleLeafClick,
          onLeafHover: setLeafHovered,
          onFruitClick: handleFruitClick,
          onFruitHover: handleFruitHover,
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
          leafMaterialMode={leafMaterialMode}
          interactionsEnabled={interactionsEnabled}
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
          onToggleInteractionsEnabled={handleToggleInteractionsEnabled}
          onLeafMaterialChange={setLeafMaterialMode}
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

      {savoirOpen && selectedSavoir && (
        <SavoirPanel savoir={selectedSavoir.savoir} onClose={handleCloseSavoir} />
      )}

      {contactOpen && selectedContact && (
        <ContactPanel contact={selectedContact.contact} onClose={handleCloseContact} />
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
