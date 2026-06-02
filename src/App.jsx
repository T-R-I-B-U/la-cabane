import { useState, useCallback, useEffect, useLayoutEffect, useRef, lazy, Suspense } from 'react'
import { io } from 'socket.io-client'
import {
  AppLoader,
  Crosshair,
  FinalScreen,
  GameManager,
  LeafArrival,
  LoadingScreen,
  NameInput,
  SavoirPanel,
  SettingsMenu,
  WelcomeScreen,
  useIntroFlow,
  useSavoirAssignment,
} from './app/index'
import { ContactPanel } from './app/ContactPanel'
import { GearIcon } from './app/GearIcon'
import { PlayerFruitPanel } from './app/PlayerFruitPanel'
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
import {
  setSubtitleChoices,
  unlockAndPlay,
  playOnce,
  setGlobalVolume,
  getGlobalVolume,
  pauseAudio,
  resumeAudio,
} from './utils/audioStore'
import { cursorStore } from './utils/cursorStore'
import { fruitHoverStore } from './utils/fruitHoverStore'
import { GAME_STEPS } from './utils/gameStateStore'
import { CustomCursor } from './app/CustomCursor'
import './App.css'

const STATS_INIT = { fps: 0, frameMs: 0, calls: 0, triangles: 0, geometries: 0, textures: 0 }
const SOCKET_URL =
  import.meta.env.MODE === 'production'
    ? window.location.origin
    : `http://${window.location.hostname}:3001`
const LOADING_EXTRA_DURATION_MS = 7000
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
const CinematicPanel = lazy(() =>
  import('./app/CinematicPanel').then((mod) => ({ default: mod.CinematicPanel }))
)
export default function App() {
  const isDevBuild = import.meta.env.DEV
  const [incomingSavoir, setIncomingSavoir] = useState(null)
  const [leafArriving, setLeafArriving] = useState(false)
  const [hasSentSavoir, setHasSentSavoir] = useState(false)
  const [sentSavoirDrawing, setSentSavoirDrawing] = useState(null)
  const [sentSavoirTitle, setSentSavoirTitle] = useState(null)
  const savoirLeafColRef = useRef(null)
  const [showWelcome, setShowWelcome] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [isUiHidden, setIsUiHidden] = useState(false)
  const [showFinal, setShowFinal] = useState(false)
  const [welcomeFading, setWelcomeFading] = useState(false)
  const [loadingFading, setLoadingFading] = useState(false)
  const [readyToShow, setReadyToShow] = useState(false)
  const [stats, setStats] = useState(STATS_INIT)
  const [sceneLoadStatus, setSceneLoadStatus] = useState('loading')
  const [sceneLoadInfo, setSceneLoadInfo] = useState(null)
  const [modelQuality, setModelQuality] = useState('compressed2')
  const [isPlayerModeActive, setIsPlayerModeActive] = useState(false)
  const [isFlyModeActive, setIsFlyModeActive] = useState(false)
  const [debugDoors, setDebugDoors] = useState(false)
  const [debugCollisions, setDebugCollisions] = useState(false)
  const [shaderEnabled, setShaderEnabled] = useState(true)
  const [shaderRadius, setShaderRadius] = useState(2)
  const [masterVolume, setMasterVolume] = useState(() => Math.round(getGlobalVolume() * 100))
  const [shadowsEnabled, setShadowsEnabled] = useState(true)
  const [mouseSensitivity, setMouseSensitivity] = useState(1)
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
  const [isPlayerFruitPanelOpen, setIsPlayerFruitPanelOpen] = useState(false)
  const [isLeafHovered, setIsLeafHovered] = useState(false)
  const [isFruitHovered, setIsFruitHovered] = useState(false)
  const [isStairsHovered, setIsStairsHovered] = useState(false)
  const [interactionsEnabled, setInteractionsEnabled] = useState(false)
  const [shouldRestorePointerLockAfterStoryUi, setShouldRestorePointerLockAfterStoryUi] =
    useState(false)
  const pointerControlsRef = useRef(null)
  const f1CountRef = useRef(0)
  const f1TimerRef = useRef(null)
  const isJournalInteractionActiveRef = useRef(false)
  const arbreStoryContinuityRef = useRef(false)
  const isCursorVisibleRef = useRef(false)
  const isCameraBlockedRef = useRef(false)
  const isModalOpenRef = useRef(false)
  const isInGameplayRef = useRef(false)
  const loadingRevealTimeoutRef = useRef(null)
  const loadingRevealScheduledRef = useRef(false)
  const [loadingSequenceStarted, setLoadingSequenceStarted] = useState(false)
  const [loadingExtraDurationElapsed, setLoadingExtraDurationElapsed] = useState(false)

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
    postIntro,
    receptionChoiceVisible,
    returnHallVisible,
    treePhaseActive,
    timeatmPhaseActive,
    treeStoryCameras,
    treeStoryPauseAt,
    treeStoryCameraLocked,
    onTreeStoryPause,
    onTreeStoryComplete,
    workbenchPhaseActive,
    greenhousePhaseActive,
    thomasEtabliPhaseActive,
    thomasAnimPhase,
    serreActive,
    zoePhaseActive,
    raspberryPhaseActive,
    raspberryGameCompleted,
    juiceMachinePhaseActive,
    juicePipePlaying,
    juicePhaseActive,
    juiceDrinking,
    exitSerrePhaseActive,
    arbreLadderPending,
    zoeClip,
    minigameCount,
    playerName,
    showNameInput,
    storyReady,
    currentStoryStepId,
    exitIntro,
    handleIntroEvent,
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
    handleJuiceDrinkComplete,
    handleReceptionChoice: handleReceptionChoiceInternal,
    handleReceptionInteract,
    handleReturnToHall,
    handleStoryCameraTransitionComplete,
    launchIntro,
    startIntro,
    skipDialogue: skipIntroDialogue,
    setPostIntro,
  } = useIntroFlow({ sceneReady })

  const revealSceneAfterLoading = useCallback(() => {
    startIntro()
    setLoadingFading(true)
  }, [startIntro])

  const handleLoadingFadeEnd = useCallback(() => {
    setReadyToShow(true)
    setLoadingFading(false)
  }, [])

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
    growingFruitClickable: arbreGrowingFruitClickable,
    handleGrowingFruitComplete,
    handleSavoirReceived,
    handleIncomingSavoirClosed,
    arbreLeafInteractionsEnabled,
    handleLadderClick,
    handleStairsClick,
    handleArbreTransitionComplete,
    handleLeafSavoirClosed,
    handlePlayerFruitPanelClose,
    triggerArbreBase,
    triggerArbreTop,
    triggerAutoNestOutro,
    triggerNestStairs,
    triggerNestDialogue25,
    skipDialogue: skipArbreDialogue,
    activateLadderFromStory,
  } = useArbreFlow({
    platformPosition: sceneLoadInfo?.platformPosition,
    flyMode: isFlyModeActive,
    onLadderSpawn: spawnAtLadder,
    onPlatformSpawn: spawnAtPlatform,
    onBackAtBase: spawnAtLadderDown,
    onOutroComplete: useCallback(() => {
      setShowFinal(true)
      setTimeout(() => {
        setIsPlayerModeActive(false)
        setIsFlyModeActive(false)
        exitIntro()
      }, 1200)
    }, [exitIntro]),
  })

  const openSavoirFromLeaf = useCallback(
    (id) => {
      const didOpen = openSavoirForLeaf(id)
      if (!didOpen) return
      isModalOpenRef.current = true
      setIsSavoirInteractionActive(true)
      setShouldRestorePointerLockAfterStoryUi(true)
    },
    [openSavoirForLeaf]
  )

  const openContactFromFruit = useCallback(
    (fruitId) => {
      if (fruitId === 'fruit_player') {
        setIsPlayerFruitPanelOpen(true)
        setShouldRestorePointerLockAfterStoryUi(true)
        return
      }
      const didOpen = openContactForFruit(fruitId)
      if (!didOpen) return
      setIsContactInteractionActive(true)
      setShouldRestorePointerLockAfterStoryUi(true)
    },
    [openContactForFruit]
  )

  const [showCameraEditor, setShowCameraEditor] = useState(false)
  const [showStoryDebug, setShowStoryDebug] = useState(false)
  const [showCinematicPanel, setShowCinematicPanel] = useState(false)
  const [cinematicActive, setCinematicActive] = useState(false)
  const [cinematicKeypoints, setCinematicKeypoints] = useState([])
  const [leafMaterialMode, setLeafMaterialMode] = useState('performance')

  const requestPointerLockIfSceneControlAllowed = useCallback(() => {
    if (
      showSettings ||
      dialogueActive ||
      introMovementLocked ||
      showNameInput ||
      receptionChoiceVisible ||
      returnHallVisible ||
      selectedSavoirAssignment ||
      isSavoirInteractionActive ||
      selectedContactAssignment ||
      isContactInteractionActive ||
      isPlayerFruitPanelOpen ||
      isJournalInteractionActive ||
      raspberryPhaseActive ||
      !!incomingSavoir
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
    showSettings,
    currentStoryStepId,
    dialogueActive,
    introMovementLocked,
    isContactInteractionActive,
    isPlayerFruitPanelOpen,
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
    incomingSavoir,
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

  useLayoutEffect(() => {
    if (receptionChoiceVisible) {
      setSubtitleChoices([
        { label: 'Oui', onClick: () => handleReceptionChoice('yes') },
        { label: 'Non', onClick: () => handleReceptionChoice('no') },
      ])
    } else {
      setSubtitleChoices(null)
    }
  }, [receptionChoiceVisible, handleReceptionChoice])

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

  const handleGoToArbreTop = useCallback(() => {
    arbreStoryContinuityRef.current = true
    setShouldRestorePointerLockAfterStoryUi(false)
    setPostIntro(true)
    // Spawn libre : mouvement non verrouillé, pointer lock demandé normalement
    const platformCamera = getCameraPose('arbre.atPlatform')
    setPlayerSpawn(platformCamera?.position ?? getPlatformSpawn(sceneLoadInfo?.platformPosition))
    setPlayerSpawnTarget(platformCamera?.target ?? null)
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
    triggerArbreTop()
  }, [sceneLoadInfo?.platformPosition, setPostIntro, triggerArbreTop])

  const handleGoToSentSavoirDebug = useCallback(() => {
    arbreStoryContinuityRef.current = true
    setShouldRestorePointerLockAfterStoryUi(true)
    setPostIntro(true)
    setIncomingSavoir(null)
    setLeafArriving(false)
    setIsSavoirInteractionActive(false)
    setIsSavoirPanelOpen(false)
    setIsContactInteractionActive(false)
    setIsContactPanelOpen(false)
    setHasSentSavoir(true)
    setSentSavoirDrawing('/savoir-leaf.webp')
    setSentSavoirTitle('Feuille debug envoyee')
    setIsPlayerFruitPanelOpen(true)

    const platformCamera = getCameraPose('arbre.atPlatform')
    setPlayerSpawn(platformCamera?.position ?? getPlatformSpawn(sceneLoadInfo?.platformPosition))
    setPlayerSpawnTarget(platformCamera?.target ?? null)
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

    triggerArbreTop()
  }, [sceneLoadInfo?.platformPosition, setPostIntro, triggerArbreTop])

  const handleGoToAutoNestOutro = useCallback(() => {
    arbreStoryContinuityRef.current = true
    setShouldRestorePointerLockAfterStoryUi(false)
    setPostIntro(true)

    const platformCamera = getCameraPose('arbre.atPlatform')
    setPlayerSpawn(platformCamera?.position ?? getPlatformSpawn(sceneLoadInfo?.platformPosition))
    setPlayerSpawnTarget(platformCamera?.target ?? null)
    setPlayerEyeHeight(PLAYER_HEIGHT)
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

    triggerAutoNestOutro()
  }, [sceneLoadInfo?.platformPosition, setPostIntro, triggerAutoNestOutro])

  const handleGoToNestStairs = useCallback(() => {
    arbreStoryContinuityRef.current = true
    setShouldRestorePointerLockAfterStoryUi(false)
    setPostIntro(true)
    triggerNestStairs()
  }, [setPostIntro, triggerNestStairs])

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
    const setRangeFromCursor = (el) => {
      const rect = el.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (cursorStore.x - rect.left) / rect.width))
      const min = parseFloat(el.min) || 0
      const max = parseFloat(el.max) || 100
      el.value = String(Math.round(min + ratio * (max - min)))
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }

    const onDown = () => {
      if (!isCursorVisibleRef.current) return
      const canvas = document.querySelector('canvas')
      const el = document.elementFromPoint(cursorStore.x, cursorStore.y)
      if (!el || el === canvas) return

      if (el instanceof HTMLInputElement && el.type === 'range') {
        setRangeFromCursor(el)
        const onMove = () => setRangeFromCursor(el)
        const onUp = () => {
          window.removeEventListener('mousemove', onMove, { capture: true })
          window.removeEventListener('mouseup', onUp)
        }
        window.addEventListener('mousemove', onMove, { capture: true })
        window.addEventListener('mouseup', onUp)
        return
      }

      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const handleCloseSavoir = useCallback(() => {
    isModalOpenRef.current = false
    closeSavoirInternal()
    setIsSavoirInteractionActive(false)
    setIsSavoirPanelOpen(false)
    fruitHoverStore.startCooldown()
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
    fruitHoverStore.startCooldown()
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

  const handleClosePlayerFruitPanel = useCallback(() => {
    setIsPlayerFruitPanelOpen(false)
    setShouldRestorePointerLockAfterStoryUi(false)
    fruitHoverStore.startCooldown()
    handlePlayerFruitPanelClose()
    pointerControlsRef.current?.lock()
  }, [handlePlayerFruitPanelClose])

  useEffect(() => {
    if (!isPlayerFruitPanelOpen) return
    const onKeyDown = (e) => {
      if (e.code !== 'Escape') return
      handleClosePlayerFruitPanel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isPlayerFruitPanelOpen, handleClosePlayerFruitPanel])

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
    if (!shouldRestorePointerLockAfterStoryUi || showNameInput || !postIntro || showSettings) return

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
    showSettings,
  ])

  useEffect(() => {
    isMinigameActiveRef.current = raspberryPhaseActive
  }, [raspberryPhaseActive])

  useEffect(() => {
    arbreActiveRef.current = arbreActive
  }, [arbreActive])

  useEffect(() => {
    isInGameplayRef.current = isPlayerModeActive || postIntro
  }, [isPlayerModeActive, postIntro])

  useEffect(() => {
    if (introMovementLocked) pointerControlsRef.current?.unlock()
  }, [introMovementLocked])

  useEffect(() => {
    const blockPointerLock = (e) => {
      if (isJournalInteractionActiveRef.current || isMinigameActiveRef.current)
        e.stopImmediatePropagation()
    }
    document.addEventListener('click', blockPointerLock, { capture: true })
    return () => document.removeEventListener('click', blockPointerLock, { capture: true })
  }, [])

  useEffect(() => {
    const onTab = (e) => {
      if (e.key !== 'p' && e.key !== 'P') return
      if (showWelcome) return
      if (showNameInput) return
      if (cinematicActive) return
      e.preventDefault()
      e.stopImmediatePropagation()
      if (showSettings) {
        setShowSettings(false)
      } else {
        setShowSettings(true)
        setShouldRestorePointerLockAfterStoryUi(true)
      }
    }
    document.addEventListener('keydown', onTab, { capture: true })
    return () => document.removeEventListener('keydown', onTab, { capture: true })
  }, [showSettings, showWelcome, showNameInput, cinematicActive])

  useEffect(() => {
    if (showSettings) pauseAudio()
    else resumeAudio()
  }, [showSettings])

  useEffect(() => {
    if (!receptionChoiceVisible) return

    const blockOutsideChoice = (event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('.story-choice-card button, .dialogue-choice-btn')) return

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
    return () => {
      if (loadingRevealTimeoutRef.current) {
        clearTimeout(loadingRevealTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!isDevBuild) return

    const onKeyDown = (event) => {
      if (event.code === 'F1') {
        event.preventDefault()
        f1CountRef.current += 1
        clearTimeout(f1TimerRef.current)
        if (f1CountRef.current >= 3) {
          f1CountRef.current = 0
          exitIntro()
          setReadyToShow(true)
          setIsViewerControlsVisible(true)
        } else {
          setIsViewerControlsVisible((current) => !current)
          f1TimerRef.current = setTimeout(() => {
            f1CountRef.current = 0
          }, 600)
        }
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
      } else if (event.code === 'F4') {
        event.preventDefault()
        if (cinematicActive) {
          setCinematicActive(false)
          document.exitFullscreen?.()
        } else {
          setShowCinematicPanel((current) => !current)
        }
      } else if (event.code === 'F6') {
        event.preventDefault()
        setIsUiHidden((current) => !current)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [exitIntro, setReadyToShow, cinematicActive, isDevBuild])

  useEffect(() => {
    if (!isDevBuild) return
    if (!dialogueActive && !arbreDialogueActive) return

    const onKeyDown = (event) => {
      if (event.code === 'Space') {
        event.preventDefault()
        handleSkipDialogue()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dialogueActive, arbreDialogueActive, handleSkipDialogue, isDevBuild])

  const startLoadingRevealCountdown = useCallback(() => {
    if (loadingRevealScheduledRef.current) return

    loadingRevealScheduledRef.current = true
    if (loadingRevealTimeoutRef.current) {
      clearTimeout(loadingRevealTimeoutRef.current)
    }

    loadingRevealTimeoutRef.current = window.setTimeout(() => {
      setLoadingExtraDurationElapsed(true)
      loadingRevealTimeoutRef.current = null
    }, LOADING_EXTRA_DURATION_MS)
  }, [])

  useEffect(() => {
    if (sceneLoadStatus !== 'ok' || !loadingSequenceStarted) return
    startLoadingRevealCountdown()
  }, [loadingSequenceStarted, sceneLoadStatus, startLoadingRevealCountdown])

  // Auto-launch story once the loading screen has waited 7 more seconds
  // after the scene became ready, or 7 seconds after click if it was already ready.
  useEffect(() => {
    if (readyToShow || showWelcome || sceneLoadStatus !== 'ok' || !loadingExtraDurationElapsed)
      return
    const revealTimeoutId = window.setTimeout(() => {
      revealSceneAfterLoading()
    }, 0)

    return () => window.clearTimeout(revealTimeoutId)
  }, [
    loadingExtraDurationElapsed,
    readyToShow,
    revealSceneAfterLoading,
    sceneLoadStatus,
    showWelcome,
  ])

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
    isContactInteractionActive ||
    isPlayerFruitPanelOpen ||
    !!incomingSavoir ||
    (showSettings && (postIntro || isPlayerModeActive))

  // Native OS cursor — shown before/outside the experience (dev tools, pre-launch state)
  const isNativeCursorVisible =
    !cinematicActive &&
    (showCameraEditor ||
      showCinematicPanel ||
      (!introActive &&
        !postIntro &&
        (!isPlayerModeActive || isPlayerInteractionLocked || userMovementLocked)))

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
      (showNameInput ||
        receptionChoiceVisible ||
        returnHallVisible ||
        isJournalInteractionActive ||
        isPlayerFruitPanelOpen ||
        isSavoirInteractionActive ||
        isContactInteractionActive ||
        !!incomingSavoir ||
        showSettings)
  }, [
    postIntro,
    showNameInput,
    receptionChoiceVisible,
    returnHallVisible,
    isJournalInteractionActive,
    isPlayerFruitPanelOpen,
    isSavoirInteractionActive,
    isContactInteractionActive,
    incomingSavoir,
    showSettings,
  ])

  useEffect(() => {
    isModalOpenRef.current = isSavoirInteractionActive || isContactInteractionActive
  }, [isSavoirInteractionActive, isContactInteractionActive])

  useEffect(() => {
    const socket = io(SOCKET_URL)
    socket.on('savoir-received', (data) => {
      const savoir = {
        title: data.title ?? data.theme,
        text: data.summary,
        slots: data.availability ?? [],
        drawingData: data.drawingData ?? null,
      }
      setSentSavoirDrawing(data.drawingData ?? null)
      setSentSavoirTitle(data.title ?? data.theme ?? null)
      setTimeout(() => {
        setIsPlayerFruitPanelOpen(false)
        setIncomingSavoir(savoir)
        setLeafArriving(true)
        setHasSentSavoir(true)
        handleSavoirReceived()
      }, 2500)
    })
    return () => socket.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLeafArrivalComplete = useCallback(() => {
    setLeafArriving(false)
  }, [])

  const handleCloseIncomingSavoir = useCallback(() => {
    setIncomingSavoir(null)
    fruitHoverStore.startCooldown()
    handleIncomingSavoirClosed()
    pointerControlsRef.current?.lock()
  }, [handleIncomingSavoirClosed])

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
    isDevBuild &&
    !cinematicActive &&
    !showWelcome &&
    !introPending &&
    !introActive &&
    !postIntro &&
    (isViewerControlsVisible || showCameraEditor || showStoryDebug)
  const showCameraEditorOverlay = isDevBuild && !introPending && !introActive && showCameraEditor

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
    <main
      className={`viewer-page${isNativeCursorVisible ? ' viewer-page--cursor-visible' : ''}${cinematicActive ? ' viewer-page--cinematic' : ''}`}
    >
      <GameManager
        sceneReady={sceneReady}
        introPending={introPending}
        introActive={introActive}
        postIntro={postIntro}
        storyReady={storyReady}
        explorationReady={explorationReady}
        onStepChange={handleGameStepChange}
      />
      {!cinematicActive && <Subtitles raised={raspberryPhaseActive} />}

      {!cinematicActive && !isUiHidden && (
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
            !raspberryPhaseActive &&
            !isPlayerFruitPanelOpen &&
            !leafArriving &&
            !incomingSavoir
          }
          active={(interactionsEnabled && isLeafHovered) || isFruitHovered || isStairsHovered}
        />
      )}

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
          sensitivity: mouseSensitivity,
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
          treeStoryCameras,
          treeStoryPauseAt,
          treeStoryCameraLocked,
          onTreeStoryPause,
          onTreeStoryComplete,
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
          raspberryGameCompleted,
          juiceMachinePhaseActive,
          juicePipePlaying,
          juicePhaseActive,
          juiceDrinking,
          zoeClip,
          onZoeTalk: handleZoeTalk,
          onMinigameStateChange: handleMinigameStateChange,
          onUnripeAttempt: handleUnripeAttempt,
          onJuiceMachineInteract: handleJuiceMachineInteract,
          onJuicePipeComplete: handleJuicePipeComplete,
          onJuiceInteract: handleJuiceInteract,
          onJuiceDrinkComplete: handleJuiceDrinkComplete,
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
          growingFruitClickable: arbreGrowingFruitClickable,
          fruitsDisabled:
            isContactInteractionActive ||
            isPlayerFruitPanelOpen ||
            isSavoirInteractionActive ||
            leafArriving ||
            !!incomingSavoir,
          onGrowingFruitComplete: handleGrowingFruitComplete,
          leafInteractionsEnabled:
            arbreLeafInteractionsEnabled &&
            !isSavoirInteractionActive &&
            !isContactInteractionActive &&
            !isPlayerFruitPanelOpen &&
            !leafArriving &&
            !incomingSavoir,
        }}
        leafMaterialMode={leafMaterialMode}
        interactionsEnabled={
          interactionsEnabled &&
          !isSavoirInteractionActive &&
          !isContactInteractionActive &&
          !isPlayerFruitPanelOpen &&
          !leafArriving &&
          !incomingSavoir
        }
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
        shadowsEnabled={shadowsEnabled}
        journalAutoOpenToken={journalAutoOpenToken}
        journalCloseToken={journalCloseToken}
        journalPuzzleEnabled={journalPuzzleEnabled}
        cinematicActive={cinematicActive}
        cinematicKeypoints={cinematicKeypoints}
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

      {isDevBuild && showCinematicPanel && (
        <Suspense fallback={null}>
          <CinematicPanel
            onLaunch={(keypoints) => {
              setCinematicKeypoints(keypoints)
              setCinematicActive(true)
              setShowCinematicPanel(false)
              document.documentElement.requestFullscreen?.()
            }}
            onClose={() => setShowCinematicPanel(false)}
          />
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
            onGoToArbreTop={handleGoToArbreTop}
            onGoToSentSavoirDebug={handleGoToSentSavoirDebug}
            onGoToAutoNestOutro={handleGoToAutoNestOutro}
            onGoToNestStairs={handleGoToNestStairs}
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

      {!cinematicActive && showNameInput && <NameInput onSubmit={handleNameSubmit} />}

      {!cinematicActive && returnHallVisible && (
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

      {!cinematicActive && isSavoirPanelOpen && selectedSavoirAssignment && (
        <SavoirPanel savoir={selectedSavoirAssignment.savoir} onClose={handleCloseSavoir} />
      )}

      {!cinematicActive && isContactPanelOpen && selectedContactAssignment && (
        <ContactPanel contact={selectedContactAssignment.contact} onClose={handleCloseContact} />
      )}

      {!cinematicActive && isPlayerFruitPanelOpen && (
        <PlayerFruitPanel
          playerName={playerName}
          onClose={handleClosePlayerFruitPanel}
          hasSentSavoir={hasSentSavoir}
          sentSavoirDrawing={sentSavoirDrawing}
          sentSavoirTitle={sentSavoirTitle}
        />
      )}

      {!cinematicActive && incomingSavoir && (
        <SavoirPanel
          savoir={incomingSavoir}
          onClose={handleCloseIncomingSavoir}
          leafColRef={savoirLeafColRef}
          pendingLeaf={leafArriving}
          hideFavorites
        />
      )}

      {!cinematicActive && leafArriving && (
        <LeafArrival
          drawingData={incomingSavoir?.drawingData}
          targetRef={savoirLeafColRef}
          onComplete={handleLeafArrivalComplete}
        />
      )}

      {!cinematicActive && raspberryPhaseActive && <RaspberryCounter count={minigameCount} />}

      {!cinematicActive && <CustomCursor visible={isCustomCursorVisible} />}

      {!cinematicActive && showFinal && <FinalScreen />}

      {!cinematicActive && (welcomeFading || !showWelcome) && !readyToShow && (
        <LoadingScreen
          status={sceneLoadStatus}
          error={sceneLoadStatus === 'error' ? sceneLoadInfo : null}
          fading={loadingFading}
          onAnimationEnd={handleLoadingFadeEnd}
        />
      )}

      {!cinematicActive && showWelcome && (
        <WelcomeScreen
          fading={welcomeFading}
          onStart={() => {
            setLoadingSequenceStarted(true)
            setLoadingExtraDurationElapsed(false)
            setReadyToShow(false)
            setWelcomeFading(true)
            loadingRevealScheduledRef.current = false
            if (loadingRevealTimeoutRef.current) {
              clearTimeout(loadingRevealTimeoutRef.current)
            }
            loadingRevealTimeoutRef.current = null
            if (sceneLoadStatus === 'ok') startLoadingRevealCountdown()
            const canvas = document.querySelector('canvas')
            if (canvas && !document.pointerLockElement) canvas.requestPointerLock()
          }}
          onAnimationEnd={() => setShowWelcome(false)}
        />
      )}

      {!cinematicActive && !isUiHidden && !showSettings && !showFinal && (
        <div className="app-gear-btn">
          <GearIcon
            onClick={() => {
              playOnce(showSettings ? 'closeUi' : 'clickUi')
              setShowSettings((v) => !v)
            }}
            ariaLabel={showSettings ? 'Fermer les réglages' : 'Ouvrir les réglages'}
          />
        </div>
      )}

      {!cinematicActive && !isUiHidden && (
        <SettingsMenu
          open={showSettings}
          onClose={() => setShowSettings(false)}
          volume={masterVolume}
          onVolumeChange={(v) => {
            setMasterVolume(v)
            setGlobalVolume(v / 100)
          }}
          shadersEnabled={shaderEnabled ? 'Oui' : 'Non'}
          onShadersChange={(v) => setShaderEnabled(v === 'Oui')}
          shadowsEnabled={shadowsEnabled ? 'Oui' : 'Non'}
          onShadowsChange={(v) => setShadowsEnabled(v === 'Oui')}
          sensitivity={mouseSensitivity}
          onSensitivityChange={setMouseSensitivity}
          modelQuality={modelQuality}
          onModelQualityChange={setModelQuality}
          performanceMode={leafMaterialMode === 'performance' ? 'Oui' : 'Non'}
          onPerformanceChange={(v) => {
            const enabled = v === 'Oui'
            setLeafMaterialMode(enabled ? 'performance' : 'standard')
            // Forcer la qualité basse seulement avant le chargement — sinon changer
            // modelQuality reconstruit toute la scène en pleine partie.
            if (enabled && showWelcome) setModelQuality('compressed2')
          }}
          sceneLoaded={!showWelcome}
        />
      )}
    </main>
  )
}
