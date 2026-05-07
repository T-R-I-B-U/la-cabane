import { useState, useCallback, useEffect, useRef } from 'react'
import {
  AppLoader,
  Crosshair,
  GameManager,
  IntroLoader,
  NameInput,
  SavoirPanel,
  StoryDebugPanel,
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
  const [sceneLoadStatus, setSceneLoadStatus] = useState('loading')
  const [sceneLoadInfo, setSceneLoadInfo] = useState(null)
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
  const [isJournalInteractionActive, setIsJournalInteractionActive] = useState(false)
  const [isSavoirInteractionActive, setIsSavoirInteractionActive] = useState(false)
  const [isSavoirPanelOpen, setIsSavoirPanelOpen] = useState(false)
  const [isContactInteractionActive, setIsContactInteractionActive] = useState(false)
  const [isContactPanelOpen, setIsContactPanelOpen] = useState(false)
  const [isLeafHovered, setIsLeafHovered] = useState(false)
  const [isFruitHovered, setIsFruitHovered] = useState(false)
  const [interactionsEnabled, setInteractionsEnabled] = useState(false)
  const [pendingPostIntroPointerLock, setPendingPostIntroPointerLock] = useState(false)
  const pointerControlsRef = useRef(null)
  const isJournalInteractionActiveRef = useRef(false)

  const {
    selectedSavoirAssignment,
    openSavoirForLeaf,
    closeSavoir: closeSavoirInternal,
  } = useSavoirAssignment()
  const {
    selectedContactAssignment,
    openContactForFruit,
    closeContact: closeContactInternal,
  } = useContactAssignment()

  const openSavoirFromLeaf = useCallback(
    (id) => {
      const didOpen = openSavoirForLeaf(id)
      if (!didOpen) return
      setIsSavoirInteractionActive(true)
      document.exitPointerLock()
    },
    [openSavoirForLeaf]
  )

  const openContactFromFruit = useCallback(
    (fruitId) => {
      const didOpen = openContactForFruit(fruitId)
      if (!didOpen) return
      setIsContactInteractionActive(true)
      document.exitPointerLock()
    },
    [openContactForFruit]
  )

  const handleFruitHover = useCallback((hovered) => {
    setIsFruitHovered(hovered)
  }, [])

  const handleToggleInteractionsEnabled = useCallback(() => {
    setInteractionsEnabled((current) => {
      if (current) {
        setIsLeafHovered(false)
        setIsFruitHovered(false)
      }
      return !current
    })
  }, [])

  // Open panel only after pointer lock actually releases.
  useEffect(() => {
    if (!isSavoirInteractionActive) return

    if (!document.pointerLockElement) {
      requestAnimationFrame(() => setIsSavoirPanelOpen(true))
      return
    }
    const onRelease = () => {
      if (!document.pointerLockElement) setIsSavoirPanelOpen(true)
    }
    document.addEventListener('pointerlockchange', onRelease)
    return () => document.removeEventListener('pointerlockchange', onRelease)
  }, [isSavoirInteractionActive])

  useEffect(() => {
    if (!isContactInteractionActive) return
    if (!document.pointerLockElement) {
      requestAnimationFrame(() => setIsContactPanelOpen(true))
      return
    }
    const onRelease = () => {
      if (!document.pointerLockElement) setIsContactPanelOpen(true)
    }
    document.addEventListener('pointerlockchange', onRelease)
    return () => document.removeEventListener('pointerlockchange', onRelease)
  }, [isContactInteractionActive])

  const sceneReady = sceneLoadStatus === 'ok'
  const {
    dialogueActive,
    introActive,
    introDoorOpen,
    introMovementLocked,
    introSpawn,
    storyCameraTransition,
    introPending,
    introShouldAdvance,
    introWaitingAtDoor,
    journalAutoOpenToken,
    journalCloseToken,
    journalPuzzleEnabled,
    journalUnlocked,
    loaderFading,
    postIntro,
    receptionChoiceVisible,
    returnHallVisible,
    treePhaseActive,
    workbenchPhaseActive,
    greenhousePhaseActive,
    thomasEtabliPhaseActive,
    thomasAnimPhase,
    showNameInput,
    storyReady,
    currentStoryStepId,
    dismissLoader,
    handleIntroEvent,
    handleLoaderClick,
    handleLoaderKeyDown,
    handleJournalEnd,
    handleTreeInteract,
    handleJournalInteractionStart,
    handleJournalOpen,
    handleJournalPiecePlaced,
    handleNameSubmit: handleNameSubmitInternal,
    handleDebugGoToDoorPassage,
    handleDebugGoToIntroStart,
    handleDebugGoToReception,
    handleDebugGoToTree,
    handleDebugGoToEtabli,
    handleDebugGoToSerre,
    handleWorkbenchInteract,
    handleGreenhouseDoorClick,
    handleThomasEtabliInteract,
    handleReceptionChoice: handleReceptionChoiceInternal,
    handleReceptionInteract,
    handleReturnToHall,
    handleStoryCameraTransitionComplete,
    launchIntro,
    setPostIntro,
  } = useIntroFlow({ sceneReady })
  const [showCameraEditor, setShowCameraEditor] = useState(false)
  const [showStoryDebug, setShowStoryDebug] = useState(false)
  const [leafMaterialMode, setLeafMaterialMode] = useState('standard')

  const requestScenePointerLock = useCallback(() => {
    if (
      !(playerMode || (postIntro && !showNameInput && currentStoryStepId !== 'intro.treeWelcome'))
    ) {
      return
    }
    pointerControlsRef.current?.lock()
  }, [currentStoryStepId, playerMode, postIntro, showNameInput])

  const handleNameSubmit = useCallback(
    (name) => {
      setPendingPostIntroPointerLock(true)
      handleNameSubmitInternal(name)
    },
    [handleNameSubmitInternal]
  )

  const handleReceptionChoice = useCallback(
    (choice) => {
      setPendingPostIntroPointerLock(true)
      handleReceptionChoiceInternal(choice)
    },
    [handleReceptionChoiceInternal]
  )

  const jumpToIntroStart = useCallback(() => {
    setPendingPostIntroPointerLock(false)
    handleDebugGoToIntroStart()
  }, [handleDebugGoToIntroStart])

  const jumpToDoorPassage = useCallback(() => {
    setPendingPostIntroPointerLock(false)
    handleDebugGoToDoorPassage()
  }, [handleDebugGoToDoorPassage])

  const jumpToReception = useCallback(() => {
    setPendingPostIntroPointerLock(true)
    handleDebugGoToReception()
  }, [handleDebugGoToReception])

  const jumpToTree = useCallback(() => {
    setPendingPostIntroPointerLock(true)
    handleDebugGoToTree()
  }, [handleDebugGoToTree])

  const jumpToEtabli = useCallback(() => {
    setPendingPostIntroPointerLock(true)
    handleDebugGoToEtabli()
  }, [handleDebugGoToEtabli])

  const jumpToSerre = useCallback(() => {
    setPendingPostIntroPointerLock(true)
    handleDebugGoToSerre()
  }, [handleDebugGoToSerre])

  const handleCloseSavoir = useCallback(() => {
    closeSavoirInternal()
    setIsSavoirInteractionActive(false)
    setIsSavoirPanelOpen(false)
    requestScenePointerLock()
  }, [closeSavoirInternal, requestScenePointerLock])

  const handleCloseContact = useCallback(() => {
    closeContactInternal()
    setIsContactInteractionActive(false)
    setIsContactPanelOpen(false)
    requestScenePointerLock()
  }, [closeContactInternal, requestScenePointerLock])

  const interactionLocked =
    dialogueActive ||
    introMovementLocked ||
    showNameInput ||
    receptionChoiceVisible ||
    returnHallVisible ||
    selectedSavoirAssignment !== null ||
    isSavoirInteractionActive ||
    selectedContactAssignment !== null ||
    isContactInteractionActive ||
    isJournalInteractionActive

  useEffect(() => {
    if (!pendingPostIntroPointerLock || showNameInput || !postIntro) return

    let cancelled = false
    let frameId = 0
    let attempts = 0

    const tryLock = () => {
      if (cancelled) return

      if (pointerControlsRef.current?.isLocked) {
        setPendingPostIntroPointerLock(false)
        return
      }

      if (document.pointerLockElement) {
        document.dispatchEvent(new Event('pointerlockchange'))
      } else if (pointerControlsRef.current?.lock) {
        requestScenePointerLock()
        window.setTimeout(() => {
          if (!cancelled && pointerControlsRef.current?.isLocked) {
            setPendingPostIntroPointerLock(false)
          }
        }, 0)
      }

      if (!pointerControlsRef.current?.isLocked && attempts < 8) {
        attempts += 1
        frameId = window.requestAnimationFrame(tryLock)
      }
    }

    frameId = window.requestAnimationFrame(tryLock)

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frameId)
    }
  }, [pendingPostIntroPointerLock, postIntro, requestScenePointerLock, showNameInput])

  useEffect(() => {
    const blockPointerLock = (e) => {
      if (isJournalInteractionActiveRef.current) e.stopImmediatePropagation()
    }
    document.addEventListener('click', blockPointerLock, { capture: true })
    return () => document.removeEventListener('click', blockPointerLock, { capture: true })
  }, [])

  useEffect(() => {
    if (!receptionChoiceVisible) return

    const blockOutsideChoice = (event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('.story-choice-card button')) return

      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
    }

    document.addEventListener('pointerdown', blockOutsideChoice, { capture: true })
    document.addEventListener('click', blockOutsideChoice, { capture: true })

    return () => {
      document.removeEventListener('pointerdown', blockOutsideChoice, { capture: true })
      document.removeEventListener('click', blockOutsideChoice, { capture: true })
    }
  }, [receptionChoiceVisible])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code === 'F1') {
        event.preventDefault()
        setShowUI((current) => !current)
      } else if (event.code === 'F2') {
        event.preventDefault()
        setShowCameraEditor((current) => !current)
      } else if (event.code === 'F3') {
        event.preventDefault()
        setShowStoryDebug((current) => !current)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const onReady = useCallback((data) => {
    setSceneLoadInfo(data)
    setSceneLoadStatus('ok')
  }, [])
  const onError = useCallback((msg) => {
    setSceneLoadInfo(msg)
    setSceneLoadStatus('error')
  }, [])

  function goToPlatform() {
    setPostIntro(false)
    setPlayerSpawn(getPlatformSpawn(sceneLoadInfo?.platformPosition))
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
    showNameInput ||
    receptionChoiceVisible ||
    returnHallVisible ||
    journalUnlocked ||
    (!introActive && !postIntro && (!playerMode || interactionLocked || userMovementLocked))

  const postIntroCameraEnabled = postIntro

  function togglePlayerView() {
    setPostIntro(false)

    if (playerMode) {
      setPlayerMode(false)
      setFlyMode(false)
      setUserMovementLocked(false)
      return
    }

    setPlayerSpawn(getPlayerSpawn(sceneLoadInfo?.hutPosition))
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
        // Intro terminee — pour l'instant on ne restreint pas la scene pendant le script.
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
      <AppLoader
        status={sceneLoadStatus}
        error={sceneLoadStatus === 'error' ? sceneLoadInfo : null}
      />
      <Subtitles />

      <Crosshair
        visible={
          (playerMode || postIntroCameraEnabled) &&
          !showNameInput &&
          !selectedSavoirAssignment &&
          !isSavoirInteractionActive &&
          !selectedContactAssignment &&
          !isContactInteractionActive &&
          !isJournalInteractionActive
        }
        active={interactionsEnabled && (isLeafHovered || isFruitHovered)}
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
          storyCameraTransition,
          postIntro,
          postIntroLocked: postIntroCameraEnabled,
          treePhaseActive,
          receptionActive:
            currentStoryStepId === 'intro.goToReception' &&
            postIntro &&
            !dialogueActive &&
            !storyCameraTransition &&
            !receptionChoiceVisible &&
            !journalUnlocked,
          journalUnlocked,
          interactionLocked,
          workbenchPhaseActive,
          greenhousePhaseActive,
          thomasEtabliPhaseActive,
          thomasAnimPhase,
          onEvent: handleIntroEvent,
          onReceptionInteract: handleReceptionInteract,
          onTreeInteract: handleTreeInteract,
          onWorkbenchInteract: handleWorkbenchInteract,
          onGreenhouseDoorClick: handleGreenhouseDoorClick,
          onThomasEtabliInteract: handleThomasEtabliInteract,
          onStoryCameraTransitionComplete: handleStoryCameraTransitionComplete,
        }}
        leafMaterialMode={leafMaterialMode}
        interactionsEnabled={interactionsEnabled}
        pointerControlsRef={pointerControlsRef}
        interactions={{
          onLeafClick: openSavoirFromLeaf,
          onLeafHover: setIsLeafHovered,
          onFruitClick: openContactFromFruit,
          onFruitHover: handleFruitHover,
          onJournalStart: () => {
            handleJournalInteractionStart()
            isJournalInteractionActiveRef.current = true
            setIsJournalInteractionActive(true)
            document.exitPointerLock()
          },
          onJournalOpenComplete: handleJournalOpen,
          onJournalCancel: () => {
            isJournalInteractionActiveRef.current = false
            setIsJournalInteractionActive(false)
            requestScenePointerLock()
          },
          onJournalEnd: () => {
            isJournalInteractionActiveRef.current = false
            setIsJournalInteractionActive(false)
            handleJournalEnd()
            requestScenePointerLock()
          },
          onJournalPiecePlaced: handleJournalPiecePlaced,
        }}
        shaderEnabled={shaderEnabled}
        shaderRadius={shaderRadius}
        journalAutoOpenToken={journalAutoOpenToken}
        journalCloseToken={journalCloseToken}
        journalPuzzleEnabled={journalPuzzleEnabled}
      />

      {import.meta.env.DEV && showUI && !introPending && !introActive && !postIntro && (
        <PerfMonitor stats={stats} scene={sceneLoadInfo} status={sceneLoadStatus} />
      )}

      {import.meta.env.DEV && showCameraEditor && <CameraEditorPanel />}

      {import.meta.env.DEV && showStoryDebug && (
        <StoryDebugPanel
          onGoToIntroStart={jumpToIntroStart}
          onGoToDoorPassage={jumpToDoorPassage}
          onGoToReception={jumpToReception}
          onGoToTree={jumpToTree}
          onGoToEtabli={jumpToEtabli}
          onGoToSerre={jumpToSerre}
        />
      )}

      {showUI && sceneReady && !introPending && !introActive && !postIntro && (
        <ViewerControls
          status={sceneLoadStatus}
          info={sceneLoadInfo}
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

      {receptionChoiceVisible && (
        <div
          className="story-choice"
          role="dialog"
          aria-modal="true"
          aria-labelledby="story-choice-title"
        >
          <div className="story-choice-card">
            <p id="story-choice-title" className="story-choice-label">
              Je te raconte l'origine du concept de Cabane si tu veux.
            </p>
            <div className="story-choice-actions">
              <button
                type="button"
                className="camera-toggle"
                onClick={() => handleReceptionChoice('yes')}
              >
                Oui
              </button>
              <button
                type="button"
                className="camera-toggle"
                onClick={() => handleReceptionChoice('no')}
              >
                Non
              </button>
            </div>
          </div>
        </div>
      )}

      {returnHallVisible && (
        <div
          className="story-choice"
          role="dialog"
          aria-modal="true"
          aria-labelledby="return-hall-title"
        >
          <div className="story-choice-card">
            <p id="return-hall-title" className="story-choice-label">
              Clique pour retourner dans le hall.
            </p>
            <div className="story-choice-actions">
              <button type="button" className="camera-toggle" onClick={handleReturnToHall}>
                Retourner dans le hall
              </button>
            </div>
          </div>
        </div>
      )}

      {isSavoirPanelOpen && selectedSavoirAssignment && (
        <SavoirPanel savoir={selectedSavoirAssignment.savoir} onClose={handleCloseSavoir} />
      )}

      {isContactPanelOpen && selectedContactAssignment && (
        <ContactPanel contact={selectedContactAssignment.contact} onClose={handleCloseContact} />
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
