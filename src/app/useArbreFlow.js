import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNpcDialogue } from './useNpcDialogue'
import { useStoryFlow } from './useStoryFlow'
import { useActiveZone } from '../utils/gameManagerStore'
import { setZone } from '../utils/gameManagerStore'
import { setAmbiance } from '../utils/audioStore'
import { setGameStep, GAME_STEPS } from '../utils/gameStateStore'
import { PLATFORM_POS, PLAYER_HEIGHT } from '../core/SceneConfig'
import { getCameraPose, onRegistryChange } from '../core/cameraRegistry'

function getEditablePov(cameraId, fallback) {
  const camera = getCameraPose(cameraId)
  if (!camera?.position || !camera?.target) return fallback

  return {
    ...fallback,
    position: camera.position,
    target: camera.target,
    fov: camera.fov,
  }
}

function getEditableReversePov(cameraId, fallback) {
  const camera = getCameraPose(cameraId)
  if (!camera?.position || !camera?.target) return fallback

  return {
    ...fallback,
    position: camera.position,
    target: getReverseTarget(camera.position, camera.target),
    fov: camera.fov,
  }
}

function getReverseTarget(position, target) {
  return {
    x: position.x * 2 - target.x,
    y: position.y * 2 - target.y,
    z: position.z * 2 - target.z,
  }
}

function resolveArbrePovs(platformPosition) {
  const pos = platformPosition ?? PLATFORM_POS
  const [px, py, pz] = pos
  const spawnY = py + PLAYER_HEIGHT + 3
  const fruitX = px - 2.5
  const fruitZ = pz - 2

  const povs = {
    atLadder: {
      position: { x: px, y: py - 5 + PLAYER_HEIGHT, z: pz + 5 },
      target: { x: px, y: py + 2, z: pz },
      duration: 0,
    },
    ladderDown: {
      cameraId: 'arbre.ladderDown',
      position: { x: -3.8412, y: 4.0818, z: -0.9827 },
      target: { x: -3.9712, y: 4.444, z: -1.3019 },
      duration: 2.0,
    },
    ladderTop: {
      cameraId: 'arbre.arbre.haut.echelle',
      position: { x: -4.4295, y: 21.071, z: 3.6871 },
      target: { x: -8.7355, y: 21.0986, z: 1.1458 },
      duration: 1.4,
    },
    stairs02Down: {
      cameraId: 'arbre.stairs02Down',
      position: { x: -7.685, y: 4.3005, z: 2.2315 },
      target: { x: -23.7066, y: 6.2533, z: 8.2345 },
      duration: 1.5,
    },
    stairs02Top: {
      cameraId: 'arbre.stairs02Top',
      position: { x: -15.5754, y: 12.1331, z: 13.8407 },
      target: { x: -15.8063, y: 12.0721, z: 14.28 },
      duration: 2.0,
    },
    nest: {
      cameraId: 'arbre.nest',
      position: { x: -86.2501, y: 11.5867, z: -25.4644 },
      target: { x: -86.4017, y: 10.5867, z: -20.5678 },
      duration: 2.0,
    },
    nestMarie: {
      cameraId: 'arbre.nestMarie',
      position: { x: -87.456, y: 10.708, z: -22.237 },
      target: { x: -89.268, y: 10.691, z: -17.578 },
      fov: 50,
      duration: 1.8,
    },
    // Outro cameras
    outroNest1: {
      cameraId: 'outro.outro.nest.1',
      position: { x: -82.782, y: 11.5867, z: -24.7316 },
      target: { x: -81.0478, y: 9.1486, z: -28.7377 },
      duration: 3,
      delay: 0,
      easing: 'linear',
    },
    outroNest2: {
      cameraId: 'outro.outro.nest.2',
      position: { x: -77.1038, y: 4.8585, z: -37.9987 },
      target: { x: -73.429, y: 4.4921, z: -41.3694 },
      duration: 4,
      delay: 0.2,
      easing: 'linear',
    },
    outroNest3: {
      cameraId: 'outro.outro.nest.3',
      position: { x: -70.5549, y: 4.8585, z: -37.4258 },
      target: { x: -67.7681, y: 2.2138, z: -40.6256 },
      duration: 2,
      delay: 0.2,
      easing: 'linear',
    },
    outroNest4: {
      cameraId: 'outro.outro.nest.4',
      position: { x: -66.1831, y: 1.5028, z: -42.1445 },
      target: { x: -68.309, y: 1.3161, z: -46.6663 },
      duration: 2,
      delay: 0.2,
      easing: 'linear',
    },
    outroNest5: {
      cameraId: 'outro.outro.nest.5',
      position: { x: -73.5367, y: 1.5028, z: -51.2307 },
      target: { x: -78.1896, y: 1.456, z: -49.4008 },
      duration: 3,
      delay: 0.2,
      easing: 'linear',
    },
    outroNest6: {
      cameraId: 'outro.outro.nest.6',
      position: { x: -82.8537, y: 1.5028, z: -45.5178 },
      target: { x: -87.8533, y: 1.496, z: -45.4544 },
      duration: 2,
      delay: 0.2,
      easing: 'linear',
    },
    outroNest9: {
      cameraId: 'outro.outro.nest.9',
      position: { x: -88.2225, y: 1.5028, z: -45.4497 },
      target: { x: -93.2225, y: 1.496, z: -45.4363 },
      duration: 2,
      delay: 0.2,
      easing: 'linear',
    },
    outroNest10: {
      cameraId: 'outro.outro.nest.10',
      position: { x: -102.8809, y: 7.5657, z: -50.1046 },
      target: { x: -98.0656, y: 6.9306, z: -48.9174 },
      duration: 4,
      delay: 0.2,
      easing: 'easeOut',
    },
    outroNest11: {
      cameraId: 'outro.outro.nest.11',
      position: { x: -135.0204, y: 24.1487, z: -59.2075 },
      target: { x: -130.3654, y: 23.0802, z: -57.728 },
      duration: 6,
      delay: 0.2,
      easing: 'easeInOut',
    },
    atPlatform: {
      cameraId: 'arbre.atPlatform',
      position: { x: px, y: spawnY - 0.5, z: pz },
      target: { x: px, y: spawnY, z: fruitZ },
      duration: 2.0,
    },
    atFruitFocus: {
      cameraId: 'arbre.atFruitFocus',
      position: { x: px + 2.5, y: spawnY - 0.5, z: pz + 2 },
      target: { x: fruitX, y: spawnY + 1.5, z: fruitZ },
      duration: 2.0,
    },
    outroPlatformTop: {
      cameraId: 'arbre.atPlatform',
      reverseCamera: true,
      position: { x: px, y: spawnY - 0.5, z: pz },
      target: getReverseTarget({ x: px, y: spawnY - 0.5, z: pz }, { x: px, y: spawnY, z: fruitZ }),
      duration: 1.8,
    },
    outroPlatformLadderTop: {
      cameraId: 'arbre.arbre.haut.echelle',
      position: { x: -4.4295, y: 21.071, z: 3.6871 },
      target: { x: -8.7355, y: 21.0986, z: 1.1458 },
      duration: 1.4,
    },
  }

  return Object.fromEntries(
    Object.entries(povs).map(([key, pov]) => [
      key,
      pov.reverseCamera
        ? getEditableReversePov(pov.cameraId, pov)
        : pov.cameraId
          ? getEditablePov(pov.cameraId, pov)
          : pov,
    ])
  )
}

export function useArbreFlow({
  platformPosition,
  flyMode = false,
  onLadderSpawn,
  onPlatformSpawn,
  onBackAtBase,
  onOutroComplete,
} = {}) {
  const [arbreActive, setArbreActive] = useState(false)
  const [arbreMovementLocked, setArbreMovementLocked] = useState(false)
  const [arbreDialogueActive, setArbreDialogueActive] = useState(false)
  const [arbreStoryCameraTransition, setArbreStoryCameraTransition] = useState(null)
  const [ladderClickActive, setLadderClickActive] = useState(false)
  const [stairsClickActive, setStairsClickActive] = useState(false)
  const [growingFruitPlaying, setGrowingFruitPlaying] = useState(false)
  const [growingFruitClickable, setGrowingFruitClickable] = useState(false)
  const [fruitsClickActive, setFruitsClickActive] = useState(false)
  const [fruitExploreActive, setFruitExploreActive] = useState(false)
  const [arbreExploreSecondPhase, setArbreExploreSecondPhase] = useState(false)
  // Token to force re-trigger when zone is already 'arbre'
  const [arbreStartToken, setArbreStartToken] = useState(0)
  const [ladderIsStoryMode, setLadderIsStoryMode] = useState(false)
  const [ladderOutroMode, setLadderOutroMode] = useState(false)
  const [cameraConfigVersion, setCameraConfigVersion] = useState(0)

  const playedRef = useRef(false)
  const scheduledTimeoutsRef = useRef(new Set())
  const pendingPlatformReturnAfterIncomingSavoirRef = useRef(false)
  const pendingPlatformReturnOutroRef = useRef(false)
  const pendingNestOutroAfterMarieRef = useRef(false)
  const autoNestPathRef = useRef(false)
  const zone = useActiveZone()
  const { playDialogue, stopDialogue, skipDialogue } = useNpcDialogue()
  const { currentStepId, completeStep, goToStep, resetStory } = useStoryFlow()

  const clearScheduledTimeouts = useCallback(() => {
    scheduledTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId))
    scheduledTimeoutsRef.current.clear()
  }, [])

  const scheduleFlowTimeout = useCallback((callback, delay) => {
    const timeoutId = setTimeout(() => {
      scheduledTimeoutsRef.current.delete(timeoutId)
      callback()
    }, delay)

    scheduledTimeoutsRef.current.add(timeoutId)
    return timeoutId
  }, [])

  const povs = useMemo(
    () => resolveArbrePovs(platformPosition),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [platformPosition?.[0], platformPosition?.[1], platformPosition?.[2], cameraConfigVersion]
  )

  useEffect(() => clearScheduledTimeouts, [clearScheduledTimeouts])
  useEffect(() => onRegistryChange(() => setCameraConfigVersion((version) => version + 1)), [])

  const handlePlayerFruitPanelClose = useCallback(() => {
    setFruitsClickActive(false)
    setFruitExploreActive(true)
  }, [])

  const exitArbre = useCallback(() => {
    clearScheduledTimeouts()
    pendingPlatformReturnAfterIncomingSavoirRef.current = false
    pendingPlatformReturnOutroRef.current = false
    pendingNestOutroAfterMarieRef.current = false
    autoNestPathRef.current = false
    setArbreActive(false)
    setArbreMovementLocked(false)
    setArbreDialogueActive(false)
    setArbreStoryCameraTransition(null)
    setLadderClickActive(false)
    setStairsClickActive(false)
    setFruitsClickActive(false)
    setFruitExploreActive(false)
    setGrowingFruitClickable(false)
    setLadderIsStoryMode(false)
    setLadderOutroMode(false)
    resetStory()
    stopDialogue()
    setGameStep(GAME_STEPS.EXPLORATION)
  }, [clearScheduledTimeouts, resetStory, stopDialogue])

  const flyModeRef = useRef(flyMode)
  useEffect(() => {
    flyModeRef.current = flyMode
  }, [flyMode])

  // Oneshot trigger when zone becomes 'arbre', or forced via arbreStartToken.
  // Player spawns at base of ladder in free-movement mode; locking happens on ladder click.
  useEffect(() => {
    if (zone !== 'arbre') return
    if (playedRef.current) return
    if (flyModeRef.current) return
    playedRef.current = true
    setGrowingFruitPlaying(false)
    setArbreActive(true)
    setArbreMovementLocked(false)
    setGameStep(GAME_STEPS.ARBRE_INTRO)
    goToStep('arbre.atLadder')
    setLadderClickActive(true)
    onLadderSpawn?.()
  }, [zone, arbreStartToken, goToStep, onLadderSpawn])

  const handleLadderClick = useCallback(() => {
    if (ladderOutroMode) {
      setLadderClickActive(false)
      setLadderOutroMode(false)
      setArbreMovementLocked(true)
      setArbreDialogueActive(true)
      playDialogue('arbreOutro', {
        onDone: () => {
          setArbreDialogueActive(false)
          goToStep('arbre.outroPlatformTop')
          setArbreStoryCameraTransition({ ...povs.outroPlatformTop })
        },
      })
    } else {
      setLadderClickActive(false)
      setArbreMovementLocked(true)
      completeStep('arbre.atLadder')
      setArbreStoryCameraTransition({ ...povs.ladderDown })
    }
  }, [ladderOutroMode, completeStep, playDialogue, goToStep, povs])

  const handleArbreTransitionComplete = useCallback(() => {
    if (pendingNestOutroAfterMarieRef.current) {
      pendingNestOutroAfterMarieRef.current = false
      completeStep('arbre.nestInteraction')
      setArbreDialogueActive(true)
      playDialogue('treeDialogue25', {
        onDone: () => {
          setArbreDialogueActive(false)
          completeStep('arbre.treeDialogue25')
          setAmbiance('musicEnd')
          setArbreStoryCameraTransition({ ...povs.outroNest1 })
        },
      })
      return
    }

    if (pendingPlatformReturnOutroRef.current) {
      pendingPlatformReturnOutroRef.current = false
      setArbreDialogueActive(true)
      playDialogue('arbreFinal', {
        onDone: () => {
          setArbreDialogueActive(false)
          setArbreStoryCameraTransition(null)
          setLadderClickActive(true)
          setLadderOutroMode(true)
        },
      })
      return
    }

    if (currentStepId === 'arbre.leavesDialogue') {
      setGrowingFruitPlaying(true)
      setArbreDialogueActive(true)
      playDialogue('arbreFeuilles', {
        onDone: () => {
          setArbreDialogueActive(false)
          setArbreMovementLocked(false)
          setGrowingFruitClickable(true)
          completeStep('arbre.leavesDialogue')
          pendingPlatformReturnAfterIncomingSavoirRef.current = true
          setArbreStoryCameraTransition(null)
        },
      })
    } else if (currentStepId === 'arbre.backAtBase') {
      setArbreStoryCameraTransition(null)
      onBackAtBase?.()
      if (autoNestPathRef.current) {
        scheduleFlowTimeout(() => {
          goToStep('arbre.toStairs02Down')
          setArbreStoryCameraTransition({ ...povs.stairs02Down })
        }, 300)
      } else {
        setStairsClickActive(true)
      }
    } else if (currentStepId === 'arbre.outroPlatformTop') {
      completeStep('arbre.outroPlatformTop')
      setArbreStoryCameraTransition({ ...povs.outroPlatformLadderTop })
    } else if (currentStepId === 'arbre.outroPlatformLadderTop') {
      completeStep('arbre.outroPlatformLadderTop')
      setArbreStoryCameraTransition({ ...povs.ladderDown })
    } else if (currentStepId === 'arbre.toStairs02Down') {
      scheduleFlowTimeout(() => {
        completeStep('arbre.toStairs02Down')
        setArbreStoryCameraTransition({ ...povs.stairs02Top })
      }, 500)
    } else if (currentStepId === 'arbre.toStairs02Top') {
      completeStep('arbre.toStairs02Top')
      setArbreDialogueActive(true)
      playDialogue('nidArrivee', {
        onDone: () => {
          setArbreDialogueActive(false)
          completeStep('arbre.nidDialogue')
          setArbreStoryCameraTransition({ ...povs.nest })
        },
      })
    } else if (currentStepId === 'arbre.toNest') {
      completeStep('arbre.toNest')
      setArbreDialogueActive(true)
      setArbreStoryCameraTransition({ ...povs.nestMarie })
      playDialogue('marieNid1', {
        onDone: () => {
          setArbreDialogueActive(false)
          completeStep('arbre.nestDialogue1')
          pendingNestOutroAfterMarieRef.current = true
          setArbreStoryCameraTransition({ ...povs.nest, duration: 1.4 })
        },
      })
    } else if (currentStepId === 'arbre.treeDialogue25') {
      // Only reached via debug trigger — normal flow plays dialogue inline from toNest handler
      // Keep cam on nest — do not clear transition
      setArbreDialogueActive(true)
      playDialogue('treeDialogue25', {
        onDone: () => {
          setArbreDialogueActive(false)
          completeStep('arbre.treeDialogue25')
          setAmbiance('musicEnd')
          setArbreStoryCameraTransition({ ...povs.outroNest1 })
        },
      })
    } else if (currentStepId === 'arbre.outroNest1') {
      completeStep('arbre.outroNest1')
      setArbreStoryCameraTransition({ ...povs.outroNest2 })
    } else if (currentStepId === 'arbre.outroNest2') {
      completeStep('arbre.outroNest2')
      setArbreStoryCameraTransition({ ...povs.outroNest3 })
    } else if (currentStepId === 'arbre.outroNest3') {
      completeStep('arbre.outroNest3')
      setArbreStoryCameraTransition({ ...povs.outroNest4 })
    } else if (currentStepId === 'arbre.outroNest4') {
      completeStep('arbre.outroNest4')
      setArbreStoryCameraTransition({ ...povs.outroNest5 })
    } else if (currentStepId === 'arbre.outroNest5') {
      completeStep('arbre.outroNest5')
      setArbreStoryCameraTransition({ ...povs.outroNest6 })
    } else if (currentStepId === 'arbre.outroNest6') {
      completeStep('arbre.outroNest6')
      setArbreStoryCameraTransition({ ...povs.outroNest9 })
    } else if (currentStepId === 'arbre.outroNest9') {
      completeStep('arbre.outroNest9')
      setArbreStoryCameraTransition({ ...povs.outroNest10 })
    } else if (currentStepId === 'arbre.outroNest10') {
      completeStep('arbre.outroNest10')
      setArbreStoryCameraTransition({ ...povs.outroNest11 })
    } else if (currentStepId === 'arbre.outroNest11') {
      completeStep('arbre.outroNest11')
      onOutroComplete?.()
      // Camera stays frozen — clean up arbre state after FinalScreen fade-in (1.2s)
      scheduleFlowTimeout(exitArbre, 1200)
    } else if (currentStepId === 'arbre.ladderDown') {
      scheduleFlowTimeout(() => {
        completeStep('arbre.ladderDown')
        setArbreStoryCameraTransition({ ...povs.ladderTop })
      }, 1000)
    } else if (currentStepId === 'arbre.toLadderTop') {
      setAmbiance('ambianceOutside')
      scheduleFlowTimeout(() => {
        completeStep('arbre.toLadderTop')
        setArbreStoryCameraTransition({ ...povs.atPlatform })
      }, 300)
    } else if (currentStepId === 'arbre.toPlatform') {
      setArbreStoryCameraTransition(null)
      onPlatformSpawn?.()
      completeStep('arbre.toPlatform')
      setArbreDialogueActive(true)
      playDialogue('arbrePlateforme', {
        onDone: () => {
          setArbreDialogueActive(false)
          completeStep('arbre.platformDialogue')
          setArbreMovementLocked(false)
        },
      })
    } else if (currentStepId === 'arbre.finalDialogue') {
      setArbreStoryCameraTransition(null)
      setArbreMovementLocked(false)
      setArbreExploreSecondPhase(true)
      setFruitsClickActive(true)
    }
  }, [
    currentStepId,
    completeStep,
    exitArbre,
    goToStep,
    onBackAtBase,
    onOutroComplete,
    onPlatformSpawn,
    playDialogue,
    povs,
    scheduleFlowTimeout,
  ])

  const handleFruitClickDuringLeaves = useCallback(() => {
    if (!fruitsClickActive) return
    setFruitsClickActive(false)
    setArbreExploreSecondPhase(false)
    setArbreMovementLocked(true)
    setArbreDialogueActive(true)
    playDialogue('arbreFinal', {
      onDone: () => {
        setArbreDialogueActive(false)
        completeStep('arbre.finalDialogue')
        setArbreDialogueActive(true)
        playDialogue('arbreOutro', {
          onDone: () => {
            setArbreDialogueActive(false)
            goToStep('arbre.outroPlatformTop')
            setArbreStoryCameraTransition({ ...povs.outroPlatformTop })
          },
        })
      },
    })
  }, [fruitsClickActive, completeStep, playDialogue, goToStep, povs])

  const handleGrowingFruitComplete = useCallback(() => {}, [])

  const handleSavoirReceived = useCallback(() => {
    setFruitsClickActive(false)
    setFruitExploreActive(true)
  }, [])

  const handleIncomingSavoirClosed = useCallback(() => {
    if (!arbreActive) return
    if (pendingPlatformReturnAfterIncomingSavoirRef.current) {
      pendingPlatformReturnAfterIncomingSavoirRef.current = false
      pendingPlatformReturnOutroRef.current = true
      setArbreStoryCameraTransition({ ...povs.atPlatform })
      return
    }

    setArbreDialogueActive(true)
    playDialogue('arbreFinal', {
      onDone: () => {
        setArbreDialogueActive(false)
        setLadderClickActive(true)
        setLadderOutroMode(true)
      },
    })
  }, [arbreActive, playDialogue, povs])

  const arbreLeafInteractionsEnabled =
    (currentStepId === 'arbre.exploreLeaves' || arbreExploreSecondPhase) && !fruitsClickActive

  const handleLeafSavoirClosed = useCallback(() => {
    if (currentStepId !== 'arbre.exploreLeaves') return
    completeStep('arbre.exploreLeaves')
    setArbreMovementLocked(true)
    setArbreStoryCameraTransition({ ...povs.atFruitFocus })
  }, [currentStepId, completeStep, povs])

  const activateLadderFromStory = useCallback(() => {
    // Mark as played so the zone effect doesn't re-run the init sequence when zone → 'arbre'
    playedRef.current = true
    // Switch zone now so the ladder mesh becomes visible and ArbreScene mounts
    setZone('arbre')
    setArbreActive(true)
    setArbreMovementLocked(false)
    setLadderIsStoryMode(true)
    goToStep('arbre.atLadder')
    setLadderClickActive(true)
  }, [goToStep])

  const triggerArbre = useCallback(() => {
    playedRef.current = false
    exitArbre()
    setZone('arbre')
    setArbreStartToken((t) => t + 1)
  }, [exitArbre])

  const triggerNestDialogue25 = useCallback(() => {
    playedRef.current = true
    clearScheduledTimeouts()
    stopDialogue()
    autoNestPathRef.current = false
    setArbreActive(true)
    setArbreMovementLocked(true)
    setArbreDialogueActive(false)
    setLadderClickActive(false)
    setStairsClickActive(false)
    setGrowingFruitPlaying(false)
    setFruitsClickActive(false)
    setLadderIsStoryMode(false)
    setZone('arbre')
    goToStep('arbre.treeDialogue25')
    setGameStep(GAME_STEPS.ARBRE_INTRO)
    setArbreStoryCameraTransition({ ...povs.nest })
  }, [clearScheduledTimeouts, goToStep, povs, stopDialogue])

  const triggerArbreBase = useCallback(() => {
    playedRef.current = true
    clearScheduledTimeouts()
    stopDialogue()
    autoNestPathRef.current = false
    setArbreActive(true)
    setArbreMovementLocked(false)
    setArbreDialogueActive(false)
    setArbreStoryCameraTransition(null)
    setLadderClickActive(false)
    setStairsClickActive(true)
    setGrowingFruitPlaying(false)
    setFruitsClickActive(false)
    setLadderIsStoryMode(false)
    setZone('arbre')
    goToStep('arbre.backAtBase')
    setGameStep(GAME_STEPS.ARBRE_INTRO)
    onBackAtBase?.()
  }, [clearScheduledTimeouts, goToStep, onBackAtBase, stopDialogue])

  const triggerArbreTop = useCallback(() => {
    playedRef.current = true
    clearScheduledTimeouts()
    stopDialogue()
    autoNestPathRef.current = false
    setArbreActive(true)
    setArbreMovementLocked(false)
    setArbreDialogueActive(false)
    setArbreStoryCameraTransition(null)
    setLadderClickActive(false)
    setStairsClickActive(false)
    setGrowingFruitPlaying(true)
    setGrowingFruitClickable(true)
    setFruitsClickActive(true)
    setArbreExploreSecondPhase(true)
    setLadderIsStoryMode(false)
    setZone('arbre')
    setGameStep(GAME_STEPS.ARBRE_INTRO)
  }, [clearScheduledTimeouts, stopDialogue])

  const triggerNestStairs = useCallback(() => {
    playedRef.current = true
    clearScheduledTimeouts()
    stopDialogue()
    autoNestPathRef.current = false
    setArbreActive(true)
    setArbreMovementLocked(true)
    setArbreDialogueActive(false)
    setArbreStoryCameraTransition({ ...povs.stairs02Down })
    setLadderClickActive(false)
    setStairsClickActive(false)
    setGrowingFruitPlaying(false)
    setGrowingFruitClickable(false)
    setFruitsClickActive(false)
    setLadderIsStoryMode(false)
    setZone('arbre')
    goToStep('arbre.toStairs02Down')
    setGameStep(GAME_STEPS.ARBRE_INTRO)
  }, [clearScheduledTimeouts, goToStep, povs, stopDialogue])

  const handleNestInteractionComplete = useCallback(() => {
    completeStep('arbre.nestInteraction')
    setArbreDialogueActive(true)
    playDialogue('marieNid2', {
      onDone: () => {
        setArbreDialogueActive(false)
        completeStep('arbre.nestDialogue2')
        setArbreDialogueActive(true)
        playDialogue('treeDialogue25', {
          onDone: () => {
            setArbreDialogueActive(false)
            completeStep('arbre.treeDialogue25')
            setArbreStoryCameraTransition({ ...povs.outroNest1 })
          },
        })
      },
    })
  }, [completeStep, playDialogue, povs])

  const handleStairsClick = useCallback(() => {
    setStairsClickActive(false)
    goToStep('arbre.toStairs02Down')
    setArbreStoryCameraTransition({ ...povs.stairs02Down })
  }, [goToStep, povs])

  const triggerAutoNestOutro = useCallback(() => {
    playedRef.current = true
    clearScheduledTimeouts()
    stopDialogue()
    autoNestPathRef.current = true
    setArbreActive(true)
    setArbreMovementLocked(true)
    setArbreDialogueActive(true)
    setArbreStoryCameraTransition(null)
    setLadderClickActive(false)
    setStairsClickActive(false)
    setGrowingFruitPlaying(false)
    setGrowingFruitClickable(false)
    setFruitsClickActive(false)
    setLadderIsStoryMode(false)
    setLadderOutroMode(false)
    setZone('arbre')
    setGameStep(GAME_STEPS.ARBRE_INTRO)
    playDialogue('arbreOutro', {
      onDone: () => {
        setArbreDialogueActive(false)
        goToStep('arbre.outroPlatformTop')
        setArbreStoryCameraTransition({ ...povs.outroPlatformTop })
      },
    })
  }, [clearScheduledTimeouts, goToStep, playDialogue, povs, stopDialogue])

  return {
    arbreActive,
    arbreMovementLocked,
    arbreDialogueActive,
    arbreStoryCameraTransition,
    ladderClickActive,
    stairsClickActive,
    ladderIsStoryMode,
    growingFruitPlaying,
    growingFruitClickable,
    handleGrowingFruitComplete,
    handleSavoirReceived,
    handleIncomingSavoirClosed,
    fruitsClickActive,
    fruitExploreActive,
    arbreLeafInteractionsEnabled,
    handleLadderClick,
    handleStairsClick,
    handleNestInteractionComplete,
    handleArbreTransitionComplete,
    handlePlayerFruitPanelClose,
    triggerNestDialogue25,
    triggerAutoNestOutro,
    triggerNestStairs,
    triggerArbreBase,
    triggerArbreTop,
    handleFruitClickDuringLeaves,
    handleLeafSavoirClosed,
    exitArbre,
    triggerArbre,
    skipDialogue,
    activateLadderFromStory,
  }
}
