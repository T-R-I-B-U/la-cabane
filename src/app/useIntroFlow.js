import { useCallback, useEffect, useRef, useState } from 'react'
import { useNpcDialogue } from './useNpcDialogue'
import { useStoryFlow } from './useStoryFlow'

export function useIntroFlow({ sceneReady }) {
  const [introActive, setIntroActive] = useState(false)
  const [introDoorOpen, setIntroDoorOpen] = useState(false)
  const [introWaitingAtDoor, setIntroWaitingAtDoor] = useState(false)
  const [introShouldAdvance, setIntroShouldAdvance] = useState(false)
  const [introPending, setIntroPending] = useState(false)
  const [postIntro, setPostIntro] = useState(false)
  const [showNameInput, setShowNameInput] = useState(false)
  const [loaderFading, setLoaderFading] = useState(false)
  const [introMovementLocked, setIntroMovementLocked] = useState(false)
  const [introSpawn, setIntroSpawn] = useState(null)
  const [playerName, setPlayerName] = useState('')
  const ignoreNextPointerUnlockRef = useRef(false)
  const { dialogueActive, playDialogue, stopDialogue } = useNpcDialogue()
  const { currentStepId, objective, completeStep, resetStory, startStory } = useStoryFlow()
  const storyReady = currentStepId === 'intro.goToReception'

  const exitIntro = useCallback(() => {
    setIntroActive(false)
    setIntroPending(false)
    setPostIntro(false)
    setShowNameInput(false)
    setIntroDoorOpen(false)
    setIntroWaitingAtDoor(false)
    setIntroShouldAdvance(false)
    setIntroMovementLocked(false)
    setIntroSpawn(null)
    setPlayerName('')
    ignoreNextPointerUnlockRef.current = false
    resetStory()
    stopDialogue()
  }, [resetStory, stopDialogue])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code === 'Escape') exitIntro()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [exitIntro])

  useEffect(() => {
    if (!postIntro) return

    let wasLocked = false
    const onPointerLockChange = () => {
      if (document.pointerLockElement) wasLocked = true
      else if (ignoreNextPointerUnlockRef.current) {
        ignoreNextPointerUnlockRef.current = false
      } else if (wasLocked) {
        exitIntro()
      }
    }

    document.addEventListener('pointerlockchange', onPointerLockChange)
    return () => document.removeEventListener('pointerlockchange', onPointerLockChange)
  }, [postIntro, exitIntro])

  useEffect(() => {
    if (!showNameInput || !document.pointerLockElement) return

    ignoreNextPointerUnlockRef.current = true
    document.exitPointerLock()
  }, [showNameInput])

  const handleIntroEvent = useCallback(
    (event, payload) => {
      if (event === 'camera:ready') {
        setLoaderFading(true)
      }

      if (event === 'wait:door') setIntroWaitingAtDoor(true)

      if (event === 'door:clicked') {
        setIntroWaitingAtDoor(false)
        setIntroShouldAdvance(true)
      }

      if (event === 'door:open') setIntroDoorOpen(true)

      if (event === 'inside') {
        if (payload) setIntroSpawn(payload)
        setIntroDoorOpen(false)
        setIntroShouldAdvance(false)
        setIntroActive(false)
        setPostIntro(true)
        setIntroMovementLocked(true)
        startStory('intro.treeWelcome')
        playDialogue('dialogue1', {
          onDone: () => {
            completeStep('intro.treeWelcome')
            setShowNameInput(true)
          },
        })
      }
    },
    [completeStep, playDialogue, startStory]
  )

  const handleNameSubmit = useCallback(
    (name) => {
      setPlayerName(name)
      setShowNameInput(false)
      completeStep('intro.nameInput')
      setIntroMovementLocked(true)
      playDialogue('dialogue2', {
        onDone: () => {
          completeStep('intro.cabanePresentation')
          setIntroMovementLocked(false)
        },
      })
    },
    [completeStep, playDialogue]
  )

  const launchIntro = useCallback(() => {
    if (!sceneReady) return

    setPostIntro(false)
    setShowNameInput(false)
    ignoreNextPointerUnlockRef.current = false
    resetStory()
    setIntroPending(true)
  }, [resetStory, sceneReady])

  const handleLoaderClick = useCallback(() => {
    if (!sceneReady || loaderFading) return

    setIntroDoorOpen(false)
    setIntroWaitingAtDoor(false)
    setIntroShouldAdvance(false)
    setIntroActive(true)
  }, [loaderFading, sceneReady])

  const handleLoaderKeyDown = useCallback(
    (event) => {
      if (loaderFading || (event.key !== 'Enter' && event.key !== ' ')) return

      event.preventDefault()
      handleLoaderClick()
    },
    [handleLoaderClick, loaderFading]
  )

  const dismissLoader = useCallback(() => {
    setLoaderFading(false)
    setIntroPending(false)
  }, [])

  return {
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
    playerName,
    postIntro,
    showNameInput,
    storyReady,
    currentStoryStepId: currentStepId,
    dismissLoader,
    exitIntro,
    handleIntroEvent,
    handleLoaderClick,
    handleLoaderKeyDown,
    handleNameSubmit,
    launchIntro,
    playDialogue,
    setPostIntro,
  }
}
