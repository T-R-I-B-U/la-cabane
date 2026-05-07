import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNpcDialogue } from './useNpcDialogue'
import { useStoryFlow } from './useStoryFlow'
import { useActiveZone } from '../utils/gameManagerStore'
import { setZone } from '../utils/gameManagerStore'
import { setGameStep, GAME_STEPS } from '../utils/gameStateStore'
import { PLATFORM_POS, PLAYER_HEIGHT } from '../core/SceneConfig'

function resolveArbrePovs(platformPosition) {
  const pos = platformPosition ?? PLATFORM_POS
  const [px, py, pz] = pos
  const spawnY = py + PLAYER_HEIGHT + 3
  const fruitZ = pz - 1

  return {
    atLadder: {
      position: { x: px, y: py - 5 + PLAYER_HEIGHT, z: pz + 5 },
      target: { x: px, y: py + 2, z: pz },
      duration: 0,
    },
    atPlatform: {
      position: { x: px, y: spawnY - 0.5, z: pz },
      target: { x: px, y: spawnY, z: fruitZ },
      duration: 2.0,
    },
    atFruitFocus: {
      position: { x: px + 2.5, y: spawnY - 0.5, z: pz + 2 },
      target: { x: px, y: spawnY, z: fruitZ },
      duration: 2.0,
    },
  }
}

export function useArbreFlow({ platformPosition, onPlatformSpawn } = {}) {
  const [arbreActive, setArbreActive] = useState(false)
  const [arbreMovementLocked, setArbreMovementLocked] = useState(false)
  const [arbreDialogueActive, setArbreDialogueActive] = useState(false)
  const [arbreStoryCameraTransition, setArbreStoryCameraTransition] = useState(null)
  const [ladderClickActive, setLadderClickActive] = useState(false)
  const [growingFruitPlaying, setGrowingFruitPlaying] = useState(false)
  const [fruitsClickActive, setFruitsClickActive] = useState(false)
  // Token to force re-trigger when zone is already 'arbre'
  const [arbreStartToken, setArbreStartToken] = useState(0)

  const playedRef = useRef(false)
  const zone = useActiveZone()
  const { playDialogue, stopDialogue } = useNpcDialogue()
  const { currentStepId, completeStep, goToStep, resetStory } = useStoryFlow()

  const povs = useMemo(
    () => resolveArbrePovs(platformPosition),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [platformPosition?.[0], platformPosition?.[1], platformPosition?.[2]]
  )

  const exitArbre = useCallback(() => {
    setArbreActive(false)
    setArbreMovementLocked(false)
    setArbreDialogueActive(false)
    setArbreStoryCameraTransition(null)
    setLadderClickActive(false)
    setGrowingFruitPlaying(false)
    setFruitsClickActive(false)
    resetStory()
    stopDialogue()
    setGameStep(GAME_STEPS.EXPLORATION)
  }, [resetStory, stopDialogue])

  // Oneshot trigger when zone becomes 'arbre', or forced via arbreStartToken
  useEffect(() => {
    if (zone !== 'arbre') return
    if (playedRef.current) return
    playedRef.current = true
    setArbreActive(true)
    setArbreMovementLocked(true)
    setGameStep(GAME_STEPS.ARBRE_INTRO)
    goToStep('arbre.atLadder')
    setLadderClickActive(true)
    setArbreStoryCameraTransition({ ...povs.atLadder })
  }, [zone, arbreStartToken, goToStep, povs])

  const handleLadderClick = useCallback(() => {
    setLadderClickActive(false)
    completeStep('arbre.atLadder')
    setArbreStoryCameraTransition({ ...povs.atPlatform })
  }, [completeStep, povs])

  const handleArbreTransitionComplete = useCallback(() => {
    if (currentStepId === 'arbre.toPlatform') {
      setArbreStoryCameraTransition(null)
      onPlatformSpawn?.()
      completeStep('arbre.toPlatform')
      setArbreDialogueActive(true)
      playDialogue('arbrePlateforme', {
        onDone: () => {
          setArbreDialogueActive(false)
          completeStep('arbre.platformDialogue')
          setArbreMovementLocked(false)
          setFruitsClickActive(true)
          setGrowingFruitPlaying(true)
        },
      })
    } else if (currentStepId === 'arbre.finalDialogue') {
      setArbreDialogueActive(true)
      playDialogue('arbreFinal', {
        onDone: () => {
          setArbreDialogueActive(false)
          completeStep('arbre.finalDialogue')
          exitArbre()
        },
      })
    }
  }, [currentStepId, completeStep, onPlatformSpawn, playDialogue, exitArbre])

  const handleFruitClickDuringLeaves = useCallback(() => {
    if (!fruitsClickActive) return
    setFruitsClickActive(false)
    setArbreMovementLocked(true)
    completeStep('arbre.exploreLeaves')
    setArbreDialogueActive(true)
    playDialogue('arbreFeuilles', {
      onDone: () => {
        setArbreDialogueActive(false)
        completeStep('arbre.leavesDialogue')
        setArbreStoryCameraTransition({ ...povs.atFruitFocus })
      },
    })
  }, [fruitsClickActive, completeStep, playDialogue, povs])

  const arbreLeafInteractionsEnabled = currentStepId === 'arbre.exploreLeaves'

  const triggerArbre = useCallback(() => {
    playedRef.current = false
    exitArbre()
    setZone('arbre')
    setArbreStartToken((t) => t + 1)
  }, [exitArbre])

  return {
    arbreActive,
    arbreMovementLocked,
    arbreDialogueActive,
    arbreStoryCameraTransition,
    ladderClickActive,
    growingFruitPlaying,
    fruitsClickActive,
    arbreLeafInteractionsEnabled,
    handleLadderClick,
    handleArbreTransitionComplete,
    handleFruitClickDuringLeaves,
    exitArbre,
    triggerArbre,
  }
}
