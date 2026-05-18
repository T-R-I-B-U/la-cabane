import { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react'
import {
  AppLoader,
  Crosshair,
  GameManager,
  IntroLoader,
  NameInput,
  SavoirPanel,
  WelcomeScreen,
  useIntroFlow,
  useSavoirAssignment,
} from './app/index'
import { ContactPanel } from './app/ContactPanel'
import { RaspberryCounter } from './app/RaspberryCounter'
import { useContactAssignment } from './app/useContactAssignment'
import { useArbreFlow } from './app/useArbreFlow'
import Scene from './core/Scene'
import { DEFAULT_HDRI_ID, HDRI_OPTIONS, NO_HDRI_ID } from './core/scene/hdriOptions'
import {
  getLadderBaseSpawn,
  getPlatformSpawn,
  getPlayerSpawn,
  PLAYER_HEIGHT,
} from './core/SceneConfig'
import { getCameraPose, setEditorFlyMode } from './core/cameraRegistry'
import Subtitles from './core/audio/Subtitles'
import { unlockAndPlay } from './utils/audioStore'
import { cursorStore } from './utils/cursorStore'
import { GAME_STEPS } from './utils/gameStateStore'
import { CustomCursor } from './app/CustomCursor'
import './App.css'

const STATS_INIT = { fps: 0, frameMs: 0, calls: 0, triangles: 0, geometries: 0, textures: 0 }
const ViewerControls = lazy(() =>
  import('./app/ViewerControls').then((mod) => ({ default: mod.ViewerControls }))
)
const StoryDebugPanel = lazy(() =>
  import('./app/StoryDebugPanel').then((mod) => ({ default: mod.StoryDebugPanel }))
)
const CameraEditorPanel = lazy(() =>
  import('./core/CameraEditorPanel').then((mod) => ({ default: mod.default }))
)
const PerfMonitor = lazy(() =>
  import('./core/PerfMonitor').then((mod) => ({ default: mod.PerfMonitor }))
)
export default function App() {
  const isDevBuild = import.meta.env.DEV
  const [showWelcome, setShowWelcome] = useState(true)
  const [welcomeFading, setWelcomeFading] = useState(false)
  const [stats, setStats] = useState(STATS_INIT)
  const [sceneLoadStatus, setSceneLoadStatus] = useState('loading')
  const [sceneLoadInfo, setSceneLoadInfo] = useState(null)
  const [modelQuality, setModelQuality] = useState('compressed2')
  const [isPlayerModeActive, setIsPlayerModeActive] = useState(false)
  const [isFlyModeActive, setIsFlyModeActive] = useState(false)
  const [debugDoors, setDebugDoors] = useState(false)
  const [debugCollisions, setDebugCollisions] = useState(false)
  const [shaderEnabled, setShaderEnabled] = useState(false)
  const [shaderRadius, setShaderRadius] = useState(3)
  const [activeHdriId, setActiveHdriId] = useState(DEFAULT_HDRI_ID)
  const [isViewerControlsVisible, setIsViewerControlsVisible] = useState(isDevBuild)
  const [playerSpawn, setPlayerSpawn] = useState(null)
  const [playerSpawnTarget, setPlayerSpawnTarget] = useState(null)
  const [playerEyeHeight, setPlayerEyeHeight] = useState(PLAYER_HEIGHT)
  const [playerSpawnKey, setPlayerSpawnKey] = useState(0)
  const [userMovementLocked, setUserMovementLocked] = useState(false)
  const [isJournalInteractionActive, setIsJournalInteractionActive] = useState(false)
  const isMinigameActiveRef = useRef(false)
  const arbreActiveRef = useRef(false)
  const [isSavoirInteractionActive, setIsSavoirInteractionActive] = useState(false)
  const [isSavoirPanelOpen, setIsSavoirPanelOpen] = useState(false)
  const [isContactInteractionActive, setIsContactInteractionActive] = useState(false)
  const [isContactPanelOpen, setIsContactPanelOpen] = useState(false)
  const [isLeafHovered, setIsLeafHovered] = useState(false)
  const [isFruitHovered, setIsFruitHovered] = useState(false)
  const [isStairsHovered, setIsStairsHovered] = useState(false)
  const [interactionsEnabled, setInteractionsEnabled] = useState(false)
  const [shouldRestorePointerLockAfterStoryUi, setShouldRestorePointerLockAfterStoryUi] =
    useState(false)
  const pointerControlsRef = useRef(null)
  const isJournalInteractionActiveRef = useRef(false)
  const arbreStoryContinuityRef = useRef(false)
  const isCursorVisibleRef = useRef(false)
  const isCameraBlockedRef = useRef(false)
  const isModalOpenRef = useRef(false)

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

  useEffect(() => {
    if (!isSavoirInteractionActive) return
    const frameId = requestAnimationFrame(() => setIsSavoirPanelOpen(true))
    return () => cancelAnimationFrame(frameId)
  }, [isSavoirInteractionActive])

  useEffect(() => {
    if (!isContactInteractionActive) return
    const frameId = requestAnimationFrame(() => setIsContactPanelOpen(true))
    return () => cancelAnimationFrame(frameId)
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
    timeatmPhaseActive,
    workbenchPhaseActive,
    greenhousePhaseActive,
    thomasEtabliPhaseActive,
    thomasAnimPhase,
    serreActive,
    zoePhaseActive,
    raspberryPhaseActive,
    juiceMachinePhaseActive,
    juicePipePlaying,
    juicePhaseActive,
    exitSerrePhaseActive,
    arbreLadderPending,
    zoeClip,
    minigameCount,
    showNameInput,
    storyReady,
    currentStoryStepId,
    dismissLoader,
    handleIntroEvent,
    handleLoaderClick,
    handleLoaderKeyDown,
    handleJournalEnd,
    handleTreeInteract,
    handleTimeatmInteract,
    handleJournalInteractionStart,
    handleJournalOpen,
    handleJournalPiecePlaced,
    handleNameSubmit: handleNameSubmitInternal,
    handleDebugGoToIntroStart,
    handleDebugGoToBienvenue,
    handleDebugGoToAccueil,
    handleDebugGoToJournal,
    handleDebugGoToArbreApresJournal,
    handleDebugGoToEtabli,
    handleDebugGoToThomasEtabli,
    handleDebugGoToSerre,
    handleDebugGoToZoeSerre,
    handleDebugGoToMinijeu,
    handleDebugGoToJuiceMachine,
    handleDebugGoToSortieSerre,
    handleWorkbenchInteract,
    handleGreenhouseDoorClick,
    handleExitSerreDoorClick,
    handleThomasEtabliInteract,
    handleZoeTalk,
    handleMinigameStateChange,
    handleUnripeAttempt,
    handleJuiceMachineInteract,
    handleJuicePipeComplete,
    handleJuiceInteract,
    handleReceptionChoice: handleReceptionChoiceInternal,
    handleReceptionInteract,
    handleReturnToHall,
    handleStoryCameraTransitionComplete,
    launchIntro,
    skipDialogue: skipIntroDialogue,
    setPostIntro,
  } = useIntroFlow({ sceneReady, arbreActiveRef, modalActiveRef: isModalOpenRef })

  const spawnAtLadder = useCallback(() => {
    const spawn = getLadderBaseSpawn(sceneLoadInfo?.platformPosition, sceneLoadInfo?.hutPosition)
    if (!arbreStoryContinuityRef.current) setPostIntro(false)
    setPlayerSpawn(spawn.position)
    setPlayerSpawnTarget(spawn.target)
    setPlayerEyeHeight(PLAYER_HEIGHT)
    setPlayerSpawnKey((k) => k + 1)
    setUserMovementLocked(false)
    setIsPlayerModeActive(true)
    setIsFlyModeActive(false)
    if (!document.pointerLockElement) {
      setTimeout(() => {
        const canvas = document.querySelector('canvas')
        if (canvas && !document.pointerLockElement) canvas.requestPointerLock()
      }, 10)
    }
  }, [sceneLoadInfo?.platformPosition, sceneLoadInfo?.hutPosition, setPostIntro])

  const spawnAtPlatform = useCallback(() => {
    const platformCamera = getCameraPose('arbre.atPlatform')
    const platformFloorY = sceneLoadInfo?.platformPosition?.[1]
    const cameraEyeHeight =
      platformCamera?.position && Number.isFinite(platformFloorY)
        ? Math.max(platformCamera.position.y - platformFloorY, 0.1)
        : PLAYER_HEIGHT
    if (!arbreStoryContinuityRef.current) setPostIntro(false)
    setPlayerSpawn(platformCamera?.position ?? getPlatformSpawn(sceneLoadInfo?.platformPosition))
    setPlayerSpawnTarget(platformCamera?.target ?? null)
    setPlayerEyeHeight(cameraEyeHeight)
    setPlayerSpawnKey((k) => k + 1)
    setUserMovementLocked(true)
    setIsPlayerModeActive(true)
    setIsFlyModeActive(false)
    if (!document.pointerLockElement) {
      setTimeout(() => {
        const canvas = document.querySelector('canvas')
        if (canvas && !document.pointerLockElement) canvas.requestPointerLock()
      }, 10)
    }
  }, [sceneLoadInfo?.platformPosition, setPostIntro])

  // Respawn at ladderDown position after the arbre story ends.
  // Camera is already there from the story transition — no visible teleport.
  const spawnAtLadderDown = useCallback(() => {
    const ladderCamera = getCameraPose('arbre.ladderDown')
    setPlayerSpawn(ladderCamera?.position ?? { x: -3.8412, y: 4.0818, z: -0.9827 })
    setPlayerSpawnTarget(ladderCamera?.target ?? { x: -3.9712, y: 4.444, z: -1.3019 })
    setPlayerEyeHeight(PLAYER_HEIGHT)
    setPlayerSpawnKey((k) => k + 1)
    setUserMovementLocked(false)
    setIsPlayerModeActive(true)
    setIsFlyModeActive(false)
    if (!document.pointerLockElement) {
      setTimeout(() => {
        const canvas = document.querySelector('canvas')
        if (canvas && !document.pointerLockElement) canvas.requestPointerLock()
      }, 10)
    }
  }, [])

  const {
    arbreActive,
    arbreMovementLocked,
    arbreDialogueActive,
    arbreStoryCameraTransition,
    ladderClickActive,
    stairsClickActive,
    ladderIsStoryMode,
    growingFruitPlaying: arbreGrowingFruitPlaying,
    fruitsClickActive,
    arbreLeafInteractionsEnabled,
    handleLadderClick,
    handleStairsClick,
    handleArbreTransitionComplete,
    handleFruitClickDuringLeaves,
    handleLeafSavoirClosed,
    triggerArbreBase,
    triggerNestDialogue25,
    skipDialogue: skipArbreDialogue,
    activateLadderFromStory,
  } = useArbreFlow({
    platformPosition: sceneLoadInfo?.platformPosition,
    flyMode: isFlyModeActive,
    onLadderSpawn: spawnAtLadder,
    onPlatformSpawn: spawnAtPlatform,
    onBackAtBase: spawnAtLadderDown,
    onOutroComplete: handleDebugGoToIntroStart,
  })

  const openSavoirFromLeaf = useCallback(
    (id) => {
      const didOpen = openSavoirForLeaf(id)
      if (!didOpen) return
      isModalOpenRef.current = true
      setIsSavoirInteractionActive(true)
      setShouldRestorePointerLockAfterStoryUi(true)
      pointerControlsRef.current?.unlock()
    },
    [openSavoirForLeaf]
  )

  const openContactFromFruit = useCallback(
    (fruitId) => {
      const didOpen = openContactForFruit(fruitId)
      if (!didOpen) return
      setIsContactInteractionActive(true)
      setShouldRestorePointerLockAfterStoryUi(true)
    },
    [openContactForFruit]
  )

  const [showCameraEditor, setShowCameraEditor] = useState(false)
  const [showStoryDebug, setShowStoryDebug] = useState(false)
  const [leafMaterialMode, setLeafMaterialMode] = useState('standard')

  const requestPointerLockIfSceneControlAllowed = useCallback(() => {
    if (
      dialogueActive ||
      introMovementLocked ||
      showNameInput ||
      receptionChoiceVisible ||
      returnHallVisible ||
      selectedSavoirAssignment ||
      isSavoirInteractionActive ||
      selectedContactAssignment ||
      isContactInteractionActive ||
      isJournalInteractionActive ||
      raspberryPhaseActive
    ) {
      return
    }

    if (
      !(
        isPlayerModeActive ||
        (postIntro && !showNameInput && currentStoryStepId !== 'intro.treeWelcome')
      )
    ) {
      return
    }
    pointerControlsRef.current?.lock()
  }, [
    currentStoryStepId,
    dialogueActive,
    introMovementLocked,
    isContactInteractionActive,
    isJournalInteractionActive,
    isPlayerModeActive,
    isSavoirInteractionActive,
    postIntro,
    raspberryPhaseActive,
    receptionChoiceVisible,
    returnHallVisible,
    selectedContactAssignment,
    selectedSavoirAssignment,
    showNameInput,
  ])

  const handleNameSubmit = useCallback(
    (name) => {
      setShouldRestorePointerLockAfterStoryUi(true)
      handleNameSubmitInternal(name)
    },
    [handleNameSubmitInternal]
  )

  const handleReceptionChoice = useCallback(
    (choice) => {
      setShouldRestorePointerLockAfterStoryUi(true)
      handleReceptionChoiceInternal(choice)
    },
    [handleReceptionChoiceInternal]
  )

  const jumpToIntroStart = useCallback(() => {
    setShouldRestorePointerLockAfterStoryUi(false)
    handleDebugGoToIntroStart()
  }, [handleDebugGoToIntroStart])

  const jumpToBienvenue = useCallback(() => {
    setShouldRestorePointerLockAfterStoryUi(false)
    handleDebugGoToBienvenue()
  }, [handleDebugGoToBienvenue])

  const jumpToAccueil = useCallback(() => {
    setShouldRestorePointerLockAfterStoryUi(true)
    handleDebugGoToAccueil()
  }, [handleDebugGoToAccueil])

  const jumpToJournal = useCallback(() => {
    setShouldRestorePointerLockAfterStoryUi(true)
    handleDebugGoToJournal()
  }, [handleDebugGoToJournal])

  const jumpToArbreApresJournal = useCallback(() => {
    setShouldRestorePointerLockAfterStoryUi(true)
    handleDebugGoToArbreApresJournal()
  }, [handleDebugGoToArbreApresJournal])

  const jumpToEtabli = useCallback(() => {
    setShouldRestorePointerLockAfterStoryUi(true)
    handleDebugGoToEtabli()
  }, [handleDebugGoToEtabli])

  const jumpToThomasEtabli = useCallback(() => {
    setShouldRestorePointerLockAfterStoryUi(true)
    handleDebugGoToThomasEtabli()
  }, [handleDebugGoToThomasEtabli])

  const jumpToSerre = useCallback(() => {
    setShouldRestorePointerLockAfterStoryUi(false)
    handleDebugGoToSerre()
  }, [handleDebugGoToSerre])

  const jumpToZoeSerre = useCallback(() => {
    setShouldRestorePointerLockAfterStoryUi(false)
    handleDebugGoToZoeSerre()
  }, [handleDebugGoToZoeSerre])

  const jumpToMinijeu = useCallback(() => {
    setShouldRestorePointerLockAfterStoryUi(false)
    handleDebugGoToMinijeu()
  }, [handleDebugGoToMinijeu])

  const jumpToJuiceMachine = useCallback(() => {
    setShouldRestorePointerLockAfterStoryUi(false)
    handleDebugGoToJuiceMachine()
  }, [handleDebugGoToJuiceMachine])

  const jumpToSortieSerre = useCallback(() => {
    setShouldRestorePointerLockAfterStoryUi(false)
    handleDebugGoToSortieSerre()
  }, [handleDebugGoToSortieSerre])

  const handleGoToArbreBase = useCallback(() => {
    arbreStoryContinuityRef.current = true
    setShouldRestorePointerLockAfterStoryUi(false)
    setPostIntro(true)
    triggerArbreBase()
  }, [setPostIntro, triggerArbreBase])

  const handleGoToNestDialogue25 = useCallback(() => {
    arbreStoryContinuityRef.current = true
    setShouldRestorePointerLockAfterStoryUi(false)
    setPostIntro(true)
    triggerNestDialogue25()
  }, [setPostIntro, triggerNestDialogue25])

  const handleSkipDialogue = useCallback(() => {
    if (dialogueActive) skipIntroDialogue()
    else if (arbreDialogueActive) skipArbreDialogue()
  }, [dialogueActive, arbreDialogueActive, skipIntroDialogue, skipArbreDialogue])

  useEffect(() => {
    if (!arbreLadderPending) return
    arbreStoryContinuityRef.current = true
    activateLadderFromStory()
  }, [arbreLadderPending, activateLadderFromStory])

  // When entering story mode, re-confirm pointer lock so drei's PointerLockControls
  // sets isLocked = true. Without this, PlayerControls mounts without ever seeing
  // the lock event and ignores mousemove, requiring an extra click.
  useEffect(() => {
    if (!postIntro) return
    const frameId = requestAnimationFrame(() => {
      pointerControlsRef.current?.lock()
    })
    return () => cancelAnimationFrame(frameId)
  }, [postIntro])

  // window capture: update virtual cursor + block camera rotation during modal states.
  // 3D hover (leaves, fruits, book) uses manual useFrame raycasting from screen center —
  // R3F's event system doesn't work under pointer lock (clientX/Y=0, isTrusted=false).
  useEffect(() => {
    const onMouseMove = (e) => {
      cursorStore.move(e.movementX, e.movementY)
      if (isCameraBlockedRef.current) e.stopPropagation()
    }
    window.addEventListener('mousemove', onMouseMove, { capture: true })
    return () => window.removeEventListener('mousemove', onMouseMove, { capture: true })
  }, [])

  // Synthetic click dispatch: forward canvas clicks to the DOM element under the virtual cursor
  useEffect(() => {
    const onDown = () => {
      if (!isCursorVisibleRef.current) return
      const canvas = document.querySelector('canvas')
      const el = document.elementFromPoint(cursorStore.x, cursorStore.y)
      if (el && el !== canvas) {
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const handleCloseSavoir = useCallback(() => {
    isModalOpenRef.current = false
    closeSavoirInternal()
    setIsSavoirInteractionActive(false)
    setIsSavoirPanelOpen(false)
    handleLeafSavoirClosed()
    // ContactPanel/SavoirPanel stop click propagation so Drei's document.click
    // handler never fires. Call lock() directly — we're still in the user gesture.
    pointerControlsRef.current?.lock()
  }, [closeSavoirInternal, handleLeafSavoirClosed])

  const handleCloseContact = useCallback(() => {
    isModalOpenRef.current = false
    closeContactInternal()
    setIsContactInteractionActive(false)
    setIsContactPanelOpen(false)
    pointerControlsRef.current?.lock()
  }, [closeContactInternal])

  useEffect(() => {
    if (!isContactInteractionActive) return
    const onKeyDown = (e) => {
      if (e.code !== 'Escape') return
      handleCloseContact()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isContactInteractionActive, handleCloseContact])

  const isStoryBlockingPlayer =
    dialogueActive ||
    arbreDialogueActive ||
    introMovementLocked ||
    arbreMovementLocked ||
    showNameInput ||
    receptionChoiceVisible ||
    returnHallVisible
  const isModalBlockingPlayer =
    selectedSavoirAssignment !== null ||
    isSavoirInteractionActive ||
    selectedContactAssignment !== null ||
    isContactInteractionActive
  const isJournalBlockingPlayer = isJournalInteractionActive
  const isPlayerInteractionLocked =
    isStoryBlockingPlayer || isModalBlockingPlayer || isJournalBlockingPlayer

  useEffect(() => {
    if (!shouldRestorePointerLockAfterStoryUi || showNameInput || !postIntro) return

    let cancelled = false
    let frameId = 0
    let attempts = 0

    const tryLock = () => {
      if (cancelled) return

      if (pointerControlsRef.current?.isLocked) {
        setShouldRestorePointerLockAfterStoryUi(false)
        return
      }

      if (document.pointerLockElement) {
        document.dispatchEvent(new Event('pointerlockchange'))
      } else if (pointerControlsRef.current?.lock) {
        requestPointerLockIfSceneControlAllowed()
        window.setTimeout(() => {
          if (!cancelled && pointerControlsRef.current?.isLocked) {
            setShouldRestorePointerLockAfterStoryUi(false)
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
  }, [
    shouldRestorePointerLockAfterStoryUi,
    postIntro,
    requestPointerLockIfSceneControlAllowed,
    showNameInput,
  ])

  useEffect(() => {
    isMinigameActiveRef.current = raspberryPhaseActive
  }, [raspberryPhaseActive])

  useEffect(() => {
    arbreActiveRef.current = arbreActive
  }, [arbreActive])

  useEffect(() => {
    const blockPointerLock = (e) => {
      if (isJournalInteractionActiveRef.current || isMinigameActiveRef.current)
        e.stopImmediatePropagation()
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

    // Only block the native click (fires on canvas during pointer lock — harmless).
    // Do NOT block pointerdown: preventDefault() on pointerdown suppresses mousedown,
    // which would prevent our synthetic click dispatch from firing.
    document.addEventListener('click', blockOutsideChoice, { capture: true })

    return () => {
      document.removeEventListener('click', blockOutsideChoice, { capture: true })
    }
  }, [receptionChoiceVisible])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code === 'F1') {
        event.preventDefault()
        setIsViewerControlsVisible((current) => !current)
      } else if (event.code === 'F2') {
        event.preventDefault()
        setShowCameraEditor((current) => {
          const next = !current
          if (!next) setEditorFlyMode(false)
          return next
        })
      } else if (event.code === 'F3') {
        event.preventDefault()
        setShowStoryDebug((current) => !current)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!dialogueActive && !arbreDialogueActive) return
    const onKeyDown = (event) => {
      if (event.code === 'Space') {
        event.preventDefault()
        handleSkipDialogue()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dialogueActive, arbreDialogueActive, handleSkipDialogue])

  const handleSceneReady = useCallback((data) => {
    setSceneLoadInfo(data)
    setSceneLoadStatus('ok')
  }, [])
  const handleSceneLoadError = useCallback((msg) => {
    setSceneLoadInfo(msg)
    setSceneLoadStatus('error')
  }, [])

  // Custom overlay cursor — only shown when pointer lock is active and a UI is on top.
  // journalUnlocked is excluded: the user is in free camera mode looking for the book.
  // isJournalInteractionActive covers the puzzle drag phase that needs the cursor.
  const isCustomCursorVisible =
    introWaitingAtDoor ||
    showNameInput ||
    receptionChoiceVisible ||
    returnHallVisible ||
    isJournalInteractionActive ||
    raspberryPhaseActive ||
    isSavoirInteractionActive ||
    isContactInteractionActive

  // Native OS cursor — shown before/outside the experience (dev tools, pre-launch state)
  const isNativeCursorVisible =
    showCameraEditor ||
    (!introActive &&
      !postIntro &&
      (!isPlayerModeActive || isPlayerInteractionLocked || userMovementLocked))

  // Keep refs in sync for stable event handlers.
  // isCursorVisibleRef: used by mousedown dispatch.
  // isCameraBlockedRef: true only when PointerLockControls is mounted (postIntro) AND a UI
  // overlay is active — guards the mousemove stopPropagation so intro hover still works.
  useEffect(() => {
    isCursorVisibleRef.current = isCustomCursorVisible
    if (isCustomCursorVisible) cursorStore.reset()
  }, [isCustomCursorVisible])

  // Block camera rotation for modal states and journal puzzle (cursor-driven interaction).
  useEffect(() => {
    isCameraBlockedRef.current =
      postIntro &&
      (showNameInput || receptionChoiceVisible || returnHallVisible || isJournalInteractionActive)
  }, [
    postIntro,
    showNameInput,
    receptionChoiceVisible,
    returnHallVisible,
    isJournalInteractionActive,
  ])

  useEffect(() => {
    isModalOpenRef.current = isSavoirInteractionActive || isContactInteractionActive
  }, [isSavoirInteractionActive, isContactInteractionActive])

  const isStoryCameraControlEnabled = postIntro

  function toggleFreePlayerView() {
    arbreStoryContinuityRef.current = false
    setPostIntro(false)

    if (isPlayerModeActive) {
      setIsPlayerModeActive(false)
      setIsFlyModeActive(false)
      setUserMovementLocked(false)
      return
    }

    setPlayerSpawn(getPlayerSpawn(sceneLoadInfo?.hutPosition))
    setPlayerSpawnKey((k) => k + 1)
    setUserMovementLocked(false)
    setIsPlayerModeActive(true)
    setIsFlyModeActive(true)
  }

  const explorationReady = false
  const showDevOverlays =
    !introPending &&
    !introActive &&
    !postIntro &&
    (isDevBuild || isViewerControlsVisible || showCameraEditor || showStoryDebug)
  const showCameraEditorOverlay = !introPending && !introActive && showCameraEditor

  const closeCameraEditor = useCallback(() => {
    setEditorFlyMode(false)
    setShowCameraEditor(false)
  }, [])

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
        break

      case GAME_STEPS.ARBRE_INTRO:
        // Séquence arbre déclenchée — mouvement géré par arbreMovementLocked.
        break

      default:
        break
    }
  }, [])

  return (
    <main className={`viewer-page${isNativeCursorVisible ? ' viewer-page--cursor-visible' : ''}`}>
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
          (isPlayerModeActive || isStoryCameraControlEnabled) &&
          !showNameInput &&
          !receptionChoiceVisible &&
          !returnHallVisible &&
          !selectedSavoirAssignment &&
          !isSavoirInteractionActive &&
          !selectedContactAssignment &&
          !isContactInteractionActive &&
          !isJournalInteractionActive &&
          !raspberryPhaseActive
        }
        active={(interactionsEnabled && (isLeafHovered || isFruitHovered)) || isStairsHovered}
      />

      <Scene
        modelQuality={modelQuality}
        activeHdriId={activeHdriId}
        sceneState={{
          onStats: setStats,
          onReady: handleSceneReady,
          onError: handleSceneLoadError,
        }}
        player={{
          mode: isPlayerModeActive,
          flyMode: isFlyModeActive,
          spawn: playerSpawn,
          spawnTarget: playerSpawnTarget,
          eyeHeight: playerEyeHeight,
          spawnKey: playerSpawnKey,
          movementLocked: isPlayerInteractionLocked || userMovementLocked,
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
          postIntroLocked: isStoryCameraControlEnabled,
          treePhaseActive,
          timeatmPhaseActive,
          receptionActive:
            currentStoryStepId === 'intro.goToReception' &&
            postIntro &&
            !dialogueActive &&
            !storyCameraTransition &&
            !receptionChoiceVisible &&
            !journalUnlocked,
          journalUnlocked,
          interactionLocked: isPlayerInteractionLocked,
          workbenchPhaseActive,
          greenhousePhaseActive,
          exitSerrePhaseActive,
          thomasEtabliPhaseActive,
          thomasAnimPhase,
          onEvent: handleIntroEvent,
          onReceptionInteract: handleReceptionInteract,
          onTreeInteract: handleTreeInteract,
          onTimeatmInteract: handleTimeatmInteract,
          onWorkbenchInteract: handleWorkbenchInteract,
          onGreenhouseDoorClick: handleGreenhouseDoorClick,
          onExitSerreDoorClick: handleExitSerreDoorClick,
          onThomasEtabliInteract: handleThomasEtabliInteract,
          onStoryCameraTransitionComplete: handleStoryCameraTransitionComplete,
          serreActive,
          zoePhaseActive,
          raspberryPhaseActive,
          juiceMachinePhaseActive,
          juicePipePlaying,
          juicePhaseActive,
          zoeClip,
          onZoeTalk: handleZoeTalk,
          onMinigameStateChange: handleMinigameStateChange,
          onUnripeAttempt: handleUnripeAttempt,
          onJuiceMachineInteract: handleJuiceMachineInteract,
          onJuicePipeComplete: handleJuicePipeComplete,
          onJuiceInteract: handleJuiceInteract,
          cameraFixed: raspberryPhaseActive,
          serrePreview: isPlayerModeActive && !postIntro,
        }}
        arbre={{
          active: arbreActive,
          storyCameraTransition: arbreStoryCameraTransition,
          onTransitionComplete: handleArbreTransitionComplete,
          ladderClickActive: ladderClickActive && !isFlyModeActive,
          stairsClickActive,
          ladderIsStoryMode,
          onLadderClick: handleLadderClick,
          onStairsClick: handleStairsClick,
          onStairsHover: setIsStairsHovered,
          growingFruitPlaying: arbreGrowingFruitPlaying,
          fruitsClickActive,
          onFruitClickDuringLeaves: handleFruitClickDuringLeaves,
          leafInteractionsEnabled: arbreLeafInteractionsEnabled,
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
          },
          onJournalOpenComplete: handleJournalOpen,
          onJournalCancel: () => {
            isJournalInteractionActiveRef.current = false
            setIsJournalInteractionActive(false)
            requestPointerLockIfSceneControlAllowed()
          },
          onJournalEnd: () => {
            isJournalInteractionActiveRef.current = false
            setIsJournalInteractionActive(false)
            handleJournalEnd()
            requestPointerLockIfSceneControlAllowed()
          },
          onJournalPiecePlaced: handleJournalPiecePlaced,
        }}
        shaderEnabled={shaderEnabled}
        shaderRadius={shaderRadius}
        journalAutoOpenToken={journalAutoOpenToken}
        journalCloseToken={journalCloseToken}
        journalPuzzleEnabled={journalPuzzleEnabled}
      />

      {showDevOverlays && isViewerControlsVisible && (
        <Suspense fallback={null}>
          <PerfMonitor stats={stats} scene={sceneLoadInfo} status={sceneLoadStatus} />
        </Suspense>
      )}

      {showCameraEditorOverlay && (
        <Suspense fallback={null}>
          <CameraEditorPanel onClose={closeCameraEditor} />
        </Suspense>
      )}

      {showDevOverlays && showStoryDebug && (
        <Suspense fallback={null}>
          <StoryDebugPanel
            onGoToIntroStart={jumpToIntroStart}
            onGoToBienvenue={jumpToBienvenue}
            onGoToAccueil={jumpToAccueil}
            onGoToJournal={jumpToJournal}
            onGoToArbreApresJournal={jumpToArbreApresJournal}
            onGoToEtabli={jumpToEtabli}
            onGoToThomasEtabli={jumpToThomasEtabli}
            onGoToSerre={jumpToSerre}
            onGoToZoeSerre={jumpToZoeSerre}
            onGoToMinijeu={jumpToMinijeu}
            onGoToJuiceMachine={jumpToJuiceMachine}
            onGoToSortieSerre={jumpToSortieSerre}
            onGoToArbreBase={handleGoToArbreBase}
            onGoToNestDialogue25={handleGoToNestDialogue25}
          />
        </Suspense>
      )}

      {showDevOverlays && isViewerControlsVisible && sceneReady && (
        <Suspense fallback={null}>
          <ViewerControls
            status={sceneLoadStatus}
            info={sceneLoadInfo}
            sceneReady={sceneReady}
            modelQuality={modelQuality}
            introPending={introPending}
            introActive={introActive}
            playerMode={isPlayerModeActive}
            flyMode={isFlyModeActive}
            userMovementLocked={userMovementLocked}
            debugDoors={debugDoors}
            debugCollisions={debugCollisions}
            leafMaterialMode={leafMaterialMode}
            interactionsEnabled={interactionsEnabled}
            hdriOptions={HDRI_OPTIONS}
            noHdriId={NO_HDRI_ID}
            activeHdriId={activeHdriId}
            onHdriChange={setActiveHdriId}
            onModelQualityChange={setModelQuality}
            onLaunchIntro={launchIntro}
            onTogglePlayerMode={toggleFreePlayerView}
            onToggleFlyMode={() => setIsFlyModeActive((current) => !current)}
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
        </Suspense>
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

      {raspberryPhaseActive && <RaspberryCounter count={minigameCount} />}

      <CustomCursor visible={isCustomCursorVisible} />

      {showWelcome && (
        <WelcomeScreen
          fading={welcomeFading}
          onStart={() => setWelcomeFading(true)}
          onAnimationEnd={() => setShowWelcome(false)}
        />
      )}

      {introPending && (
        <IntroLoader
          fading={loaderFading}
          onClick={() => {
            const canvas = document.querySelector('canvas')
            if (canvas) canvas.requestPointerLock()
            handleLoaderClick()
          }}
          onKeyDown={(e) => {
            const canvas = document.querySelector('canvas')
            if (canvas) canvas.requestPointerLock()
            handleLoaderKeyDown(e)
          }}
          onAnimationEnd={dismissLoader}
        />
      )}
    </main>
  )
}
