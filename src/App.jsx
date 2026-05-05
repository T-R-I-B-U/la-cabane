import { useState, useCallback, useEffect, useRef } from 'react'
import {
  AppLoader,
  Crosshair,
  GameManager,
  IntroLoader,
  NameInput,
  SavoirPanel,
  ViewerControls,
  useIntroFlow,
  useSavoirAssignment,
} from './app/index'
import { ContactPanel } from './app/ContactPanel'
import { useContactAssignment } from './app/useContactAssignment'
import Scene from './core/Scene'
import CameraEditorPanel from './core/CameraEditorPanel'
import { DEFAULT_HDRI_ID, HDRI_OPTIONS, NO_HDRI_ID } from './core/scene/hdriOptions'
import { getPlatformSpawn, getPlayerSpawn } from './core/SceneConfig'
import { PerfMonitor } from './core/PerfMonitor'
import Subtitles from './core/audio/Subtitles'
import { GAME_STEPS, unlockAndPlay, setVisibilityZones } from './utils'
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
  const [contactActive, setContactActive] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [leafHovered, setLeafHovered] = useState(false)
  const [fruitHovered, setFruitHovered] = useState(false)
  const [interactionsEnabled, setInteractionsEnabled] = useState(false)
  const pointerControlsRef = useRef(null)
  const journalActiveRef = useRef(false)

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
    introSpawn,
    introPending,
    introShouldAdvance,
    introWaitingAtDoor,
    loaderFading,
    objective,
    postIntro,
    showNameInput,
    storyReady,
    currentStoryStepId,
    dismissLoader,
    handleIntroEvent,
    handleLoaderClick,
    handleLoaderKeyDown,
    handleNameSubmit,
    launchIntro,
    setPostIntro,
  } = useIntroFlow({ sceneReady })
  const [showCameraEditor, setShowCameraEditor] = useState(false)
  const [leafMaterialMode, setLeafMaterialMode] = useState('standard')

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
    const blockPointerLock = (e) => {
      if (journalActiveRef.current) e.stopImmediatePropagation()
    }
    document.addEventListener('click', blockPointerLock, { capture: true })
    return () => document.removeEventListener('click', blockPointerLock, { capture: true })
  }, [])

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

  useEffect(() => {
    if (postIntro) setVisibilityZones(['cabane'])
  }, [postIntro])

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
    introWaitingAtDoor ||
    (!introActive && !postIntro && (!playerMode || interactionLocked || userMovementLocked))

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

  const explorationReady = false

  // Appelé par GameManager à chaque transition d'étape.
  // C'est ici qu'on orchestre les sous-systèmes (audio, UI, etc.)
  // sans que GameManager ait à les connaître directement.
  const handleGameStepChange = useCallback((step) => {
    switch (step) {
      case GAME_STEPS.INIT:
        // Scène prête, mais pas encore de geste utilisateur.
        // On affiche la zone cabane de base — le joueur voit la scène derrière l'IntroLoader.
        // setVisibilityZones(['cabane']) ← décommenter si tu veux limiter la visibilité initiale
        break

      case GAME_STEPS.INTRO:
        // Premier geste utilisateur (clic IntroLoader) → AudioContext débloqué.
        // La caméra d'intro pilote la scène, on garde la même visibilité qu'en INIT.
        unlockAndPlay()
        // setVisibilityZones(['cabane']) ← si tu veux restreindre pendant l'intro
        break

      case GAME_STEPS.STORY:
        // Intro terminée — cabane seulement, nid et serre masqués pour l'instant.
        setVisibilityZones(['cabane'])
        break

      case GAME_STEPS.EXPLORATION:
        // La visite scénarisée est finie, le joueur peut explorer librement.
        setVisibilityZones(['all'])
        // → Ajouter ici : play('ambient'), fade in musique d'ambiance, etc.
        break

      default:
        break
    }
  }, [])

  return (
    <main className={`viewer-page${cursorVisible ? ' viewer-page--cursor-visible' : ''}`}>
      <GameManager
        sceneReady={sceneReady}
        introPending={introPending}
        introActive={introActive}
        postIntro={postIntro}
        storyReady={storyReady}
        explorationReady={explorationReady}
        onStepChange={handleGameStepChange}
      />
      <AppLoader status={status} error={status === 'error' ? info : null} />
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
          spawn: introSpawn,
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
          onJournalStart: () => {
            journalActiveRef.current = true
            setJournalActive(true)
            document.exitPointerLock()
          },
          onJournalCancel: () => requestScenePointerLock(),
          onJournalEnd: () => {
            journalActiveRef.current = false
            setJournalActive(false)
            requestScenePointerLock()
          },
        }}
        shaderEnabled={shaderEnabled}
        shaderRadius={shaderRadius}
      />

      {import.meta.env.DEV && showUI && !introPending && !introActive && !postIntro && (
        <PerfMonitor stats={stats} scene={info} status={status} />
      )}

      {import.meta.env.DEV && showCameraEditor && <CameraEditorPanel />}

      {showUI && sceneReady && !introPending && !introActive && !postIntro && (
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

      {showNameInput && <NameInput onSubmit={handleNameSubmit} />}

      {showUI && objective && currentStoryStepId === 'intro.goToReception' && postIntro && !dialogueActive && (
        <div className="story-objective" aria-live="polite">
          <span className="story-objective-eyebrow">Objectif</span>
          <p className="story-objective-copy">{objective}</p>
        </div>
      )}

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
