import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNpcDialogue } from './useNpcDialogue'
import { useStoryFlow } from './useStoryFlow'
import { useActiveZone } from '../utils/gameManagerStore'
import { setZone } from '../utils/gameManagerStore'
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
  const fruitZ = pz - 1

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
      position: { x: -20.9313, y: 12.1483, z: 17.147 },
      target: { x: -18.168, y: 8.8642, z: 32.0839 },
      duration: 2.0,
    },
    // Outro reverse journey — mirrors the intro WP sequence
    outroStairs02Top: {
      cameraId: 'arbre.stairs02Top',
      reverseCamera: true,
      position: { x: -15.5754, y: 12.1331, z: 13.8407 },
      target: getReverseTarget(
        { x: -15.5754, y: 12.1331, z: 13.8407 },
        { x: -15.8063, y: 12.0721, z: 14.28 }
      ),
      duration: 2.0,
    },
    outroStairs02Down: {
      cameraId: 'arbre.stairs02Down',
      reverseCamera: true,
      position: { x: -7.685, y: 4.3005, z: 2.2315 },
      target: getReverseTarget(
        { x: -7.685, y: 4.3005, z: 2.2315 },
        { x: -23.7066, y: 6.2533, z: 8.2345 }
      ),
      duration: 1.5,
    },
    // WP4 position, camera looking back out toward WP3
    outroWP4: {
      cameraId: 'arbre.outroWP4',
      position: { x: -14.3667, y: 1.3785, z: -5.1169 },
      target: { x: -23.7944, y: 1.5695, z: -5.3764 },
      duration: 2.5,
    },
    outroWP3: {
      cameraId: 'arbre.outroWP3',
      position: { x: -23.7944, y: 1.5695, z: -5.3764 },
      target: { x: -12.4469, y: 0.5678, z: -5.3619 },
      duration: 2.5,
    },
    outroWP1: {
      cameraId: 'arbre.outroWP1',
      position: { x: -39.8198, y: 7.2813, z: -8.6382 },
      target: { x: -11.3697, y: 0.642, z: -1.0329 },
      duration: 3.5,
    },
    outroWP0: {
      cameraId: 'arbre.outroWP0',
      position: { x: -84.2679, y: 25.15, z: -24.166 },
      target: { x: -9.4607, y: 7.3604, z: -2.0887 },
      duration: 3.0,
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
      target: { x: px, y: spawnY, z: fruitZ },
      duration: 2.0,
    },
    outroPlatformTop: {
      cameraId: 'arbre.atPlatform',
      position: { x: px, y: spawnY - 0.5, z: pz },
      target: { x: px, y: spawnY, z: fruitZ },
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
  const [fruitsClickActive, setFruitsClickActive] = useState(false)
  const [arbreExploreSecondPhase, setArbreExploreSecondPhase] = useState(false)
  // Token to force re-trigger when zone is already 'arbre'
  const [arbreStartToken, setArbreStartToken] = useState(0)
  const [ladderIsStoryMode, setLadderIsStoryMode] = useState(false)
  const [cameraConfigVersion, setCameraConfigVersion] = useState(0)

  const playedRef = useRef(false)
  const scheduledTimeoutsRef = useRef(new Set())
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

  const exitArbre = useCallback(() => {
    clearScheduledTimeouts()
    setArbreActive(false)
    setArbreMovementLocked(false)
    setArbreDialogueActive(false)
    setArbreStoryCameraTransition(null)
    setLadderClickActive(false)
    setStairsClickActive(false)
    setFruitsClickActive(false)
    setLadderIsStoryMode(false)
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
    setLadderClickActive(false)
    setArbreMovementLocked(true)
    completeStep('arbre.atLadder')
    setArbreStoryCameraTransition({ ...povs.ladderDown })
  }, [completeStep, povs])

  const handleArbreTransitionComplete = useCallback(() => {
    if (currentStepId === 'arbre.backAtBase') {
      setArbreStoryCameraTransition(null)
      onBackAtBase?.()
      setStairsClickActive(true)
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
      // Keep cam on nest throughout all dialogues — don't clear transition
      completeStep('arbre.toNest')
      setArbreDialogueActive(true)
      playDialogue('marieNid1', {
        onDone: () => {
          setArbreDialogueActive(false)
          completeStep('arbre.nestDialogue1')
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
                  setArbreStoryCameraTransition({ ...povs.outroStairs02Top })
                },
              })
            },
          })
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
          setArbreStoryCameraTransition({ ...povs.outroStairs02Top })
        },
      })
    } else if (currentStepId === 'arbre.outroStairs02Top') {
      completeStep('arbre.outroStairs02Top')
      setArbreStoryCameraTransition({ ...povs.outroStairs02Down })
    } else if (currentStepId === 'arbre.outroStairs02Down') {
      completeStep('arbre.outroStairs02Down')
      setArbreStoryCameraTransition({ ...povs.outroWP4 })
    } else if (currentStepId === 'arbre.outroWP4') {
      completeStep('arbre.outroWP4')
      setArbreStoryCameraTransition({ ...povs.outroWP3 })
    } else if (currentStepId === 'arbre.outroWP3') {
      completeStep('arbre.outroWP3')
      setArbreStoryCameraTransition({ ...povs.outroWP1 })
    } else if (currentStepId === 'arbre.outroWP1') {
      completeStep('arbre.outroWP1')
      setArbreStoryCameraTransition({ ...povs.outroWP0 })
    } else if (currentStepId === 'arbre.outroWP0') {
      completeStep('arbre.outroWP0')
      setArbreStoryCameraTransition(null)
      exitArbre()
      onOutroComplete?.()
    } else if (currentStepId === 'arbre.ladderDown') {
      scheduleFlowTimeout(() => {
        completeStep('arbre.ladderDown')
        setArbreStoryCameraTransition({ ...povs.ladderTop })
      }, 1000)
    } else if (currentStepId === 'arbre.toLadderTop') {
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
      setArbreMovementLocked(false)
      setArbreExploreSecondPhase(true)
      setFruitsClickActive(true)
    }
  }, [
    currentStepId,
    completeStep,
    exitArbre,
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

  const arbreLeafInteractionsEnabled =
    currentStepId === 'arbre.exploreLeaves' || arbreExploreSecondPhase

  const handleLeafSavoirClosed = useCallback(() => {
    if (currentStepId !== 'arbre.exploreLeaves') return
    completeStep('arbre.exploreLeaves')
    setArbreMovementLocked(true)
    setArbreDialogueActive(true)
    playDialogue('arbreFeuilles', {
      onDone: () => {
        setArbreDialogueActive(false)
        completeStep('arbre.leavesDialogue')
        setGrowingFruitPlaying(true)
        setArbreStoryCameraTransition({ ...povs.atFruitFocus })
      },
    })
  }, [currentStepId, completeStep, playDialogue, povs])

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
            setArbreStoryCameraTransition({ ...povs.outroStairs02Top })
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

  return {
    arbreActive,
    arbreMovementLocked,
    arbreDialogueActive,
    arbreStoryCameraTransition,
    ladderClickActive,
    stairsClickActive,
    ladderIsStoryMode,
    growingFruitPlaying,
    fruitsClickActive,
    arbreLeafInteractionsEnabled,
    handleLadderClick,
    handleStairsClick,
    handleNestInteractionComplete,
    handleArbreTransitionComplete,
    triggerNestDialogue25,
    triggerArbreBase,
    handleFruitClickDuringLeaves,
    handleLeafSavoirClosed,
    exitArbre,
    triggerArbre,
    skipDialogue,
    activateLadderFromStory,
  }
}
