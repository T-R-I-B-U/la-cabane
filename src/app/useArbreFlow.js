import { useCallback, useEffect, useRef, useState } from 'react'
import { useNpcDialogue } from './useNpcDialogue'
import { useActiveZone, setZone } from '../utils/gameManagerStore'
import { setGameStep, GAME_STEPS } from '../utils/gameStateStore'

export function useArbreFlow({ onPlatformSpawn } = {}) {
  const [arbreActive, setArbreActive] = useState(false)
  const [arbreCameraStep, setArbreCameraStep] = useState('idle')
  const [arbreShouldAdvance, setArbreShouldAdvance] = useState(false)
  const [arbreShowContinueButton, setArbreShowContinueButton] = useState(false)
  const [arbreShowFruitButton, setArbreShowFruitButton] = useState(false)
  const [arbreMovementLocked, setArbreMovementLocked] = useState(false)
  const [arbreGrowingFruitPlaying, setArbreGrowingFruitPlaying] = useState(false)

  const playedRef = useRef(false)
  const zone = useActiveZone()
  const { playDialogue, stopDialogue } = useNpcDialogue()

  // Trigger once when player first enters arbre zone
  useEffect(() => {
    if (zone === 'arbre' && !playedRef.current) {
      playedRef.current = true
      onPlatformSpawn?.()
      setArbreActive(true)
      setArbreMovementLocked(true)
      setArbreCameraStep('climbing')
      setGameStep(GAME_STEPS.ARBRE_INTRO)
    }
  }, [zone, onPlatformSpawn])

  const exitArbre = useCallback(() => {
    setArbreActive(false)
    setArbreCameraStep('idle')
    setArbreShouldAdvance(false)
    setArbreShowContinueButton(false)
    setArbreShowFruitButton(false)
    setArbreMovementLocked(false)
    setArbreGrowingFruitPlaying(false)
    stopDialogue()
    setGameStep(GAME_STEPS.EXPLORATION)
  }, [stopDialogue])

  const handleArbreEvent = useCallback(
    (event) => {
      if (event === 'reached:platform') {
        setArbreCameraStep('platform')
        setArbreShouldAdvance(false)
        playDialogue('arbrePlateforme', {
          onDone: () => setArbreShouldAdvance(true),
        })
      }

      if (event === 'reached:leaves') {
        setArbreCameraStep('leaves')
        setArbreShouldAdvance(false)
        // Fruit démarre ici — visible pendant le dialogue "C'est ton fruit qui prend forme"
        setArbreGrowingFruitPlaying(true)
        playDialogue('arbreFeuilles', {
          onDone: () => setArbreShowFruitButton(true),
        })
      }

      if (event === 'reached:fruit') {
        setArbreCameraStep('fruit')
        setArbreShouldAdvance(false)
        setArbreShowContinueButton(true)
      }

      if (event === 'done') {
        setArbreCameraStep('done')
        exitArbre()
      }
    },
    [playDialogue, exitArbre]
  )

  const handleFruitButtonClick = useCallback(() => {
    setArbreShowFruitButton(false)
    setArbreShouldAdvance(true)
  }, [])

  const handleContinueClick = useCallback(() => {
    setArbreShowContinueButton(false)
    playDialogue('arbreFinal', {
      onDone: () => setArbreShouldAdvance(true),
    })
  }, [playDialogue])

  const triggerArbre = useCallback(() => {
    playedRef.current = false
    exitArbre()
    setZone('arbre')
  }, [exitArbre])

  return {
    arbreActive,
    arbreCameraStep,
    arbreShouldAdvance,
    arbreShowContinueButton,
    arbreShowFruitButton,
    arbreMovementLocked,
    arbreGrowingFruitPlaying,
    handleArbreEvent,
    handleContinueClick,
    handleFruitButtonClick,
    exitArbre,
    triggerArbre,
  }
}
