import { useCallback, useEffect, useRef, useState } from 'react'
import { useNpcDialogue } from './useNpcDialogue'
import { STORY_CAMERA_POVS } from './storyCameraPovs'
import { useStoryFlow } from './useStoryFlow'

const INSIDE_POV = {
  position: { x: -14.3667, y: 1.3785, z: -5.1169 },
  target: { x: -12.5066, y: 1.7137, z: -5.2008 },
}

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
  const [storyCameraTransition, setStoryCameraTransition] = useState(null)
  const [receptionChoiceVisible, setReceptionChoiceVisible] = useState(false)
  const [journalUnlocked, setJournalUnlocked] = useState(false)
  const [journalAutoOpenToken, setJournalAutoOpenToken] = useState(0)
  const [journalCloseToken, setJournalCloseToken] = useState(0)
  const [journalPuzzleEnabled, setJournalPuzzleEnabled] = useState(false)
  const [returnHallVisible, setReturnHallVisible] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const ignoreNextPointerUnlockRef = useRef(false)
  const { dialogueActive, playDialogue, stopDialogue } = useNpcDialogue()
  const { currentStepId, completeStep, goToStep, resetStory, startStory } = useStoryFlow()
  const storyReady = currentStepId === 'intro.goToReception'

  const resetFlowState = useCallback(() => {
    setIntroActive(false)
    setIntroPending(false)
    setPostIntro(false)
    setShowNameInput(false)
    setIntroDoorOpen(false)
    setIntroWaitingAtDoor(false)
    setIntroShouldAdvance(false)
    setIntroMovementLocked(false)
    setIntroSpawn(null)
    setStoryCameraTransition(null)
    setReceptionChoiceVisible(false)
    setJournalUnlocked(false)
    setJournalAutoOpenToken(0)
    setJournalCloseToken(0)
    setJournalPuzzleEnabled(false)
    setReturnHallVisible(false)
    setPlayerName('')
    ignoreNextPointerUnlockRef.current = false
  }, [])

  const exitIntro = useCallback(() => {
    resetFlowState()
    resetStory()
    stopDialogue()
  }, [resetFlowState, resetStory, stopDialogue])

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

  useEffect(() => {
    if (!receptionChoiceVisible || !document.pointerLockElement) return

    ignoreNextPointerUnlockRef.current = true
    document.exitPointerLock()
  }, [receptionChoiceVisible])

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
        if (document.pointerLockElement) {
          ignoreNextPointerUnlockRef.current = true
          document.exitPointerLock()
        }
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
        },
      })
    },
    [completeStep, playDialogue]
  )

  const handleReceptionInteract = useCallback(() => {
    setStoryCameraTransition({ ...STORY_CAMERA_POVS.accueil, duration: 1.2 })
  }, [])

  const handleStoryCameraTransitionComplete = useCallback(() => {
    if (!storyCameraTransition) return
    setIntroSpawn(storyCameraTransition)
    setStoryCameraTransition(null)
    completeStep('intro.goToReception')
    playDialogue('receptionDialogue', {
      onDone: () => {
        setReceptionChoiceVisible(true)
      },
    })
  }, [completeStep, playDialogue, storyCameraTransition])

  const handleReceptionChoice = useCallback(
    (choice) => {
      setReceptionChoiceVisible(false)
      const dialogueId = choice === 'yes' ? 'receptionYesDialogue' : 'receptionNoDialogue'

      playDialogue(dialogueId, {
        onDone: () => {
          setJournalUnlocked(true)
        },
      })
    },
    [playDialogue]
  )

  const handleJournalOpen = useCallback(() => {
    setJournalPuzzleEnabled(false)
    playDialogue('bookIntroDialogue', {
      onDone: () => {
        setJournalPuzzleEnabled(true)
      },
    })
  }, [playDialogue])

  const handleJournalPiecePlaced = useCallback(
    (pieceName) => {
      const dialogueMap = {
        img01: 'bookImg1Dialogue',
        img02: 'bookImg2Dialogue',
        img03: 'bookImg3Dialogue',
        img04: 'bookImg4Dialogue',
      }

      const dialogueId = dialogueMap[pieceName]
      if (!dialogueId) return

      setJournalPuzzleEnabled(false)
      playDialogue(dialogueId, {
        onDone: () => {
          if (pieceName === 'img04') {
            setReturnHallVisible(true)
            return
          }

          setJournalPuzzleEnabled(true)
        },
      })
    },
    [playDialogue]
  )

  const handleReturnToHall = useCallback(() => {
    setReturnHallVisible(false)
    setJournalPuzzleEnabled(false)
    setJournalCloseToken((token) => token + 1)
  }, [])

  const debugGoToIntroStart = useCallback(() => {
    stopDialogue()
    resetFlowState()
    resetStory()
    setLoaderFading(true)
    setIntroActive(true)
  }, [resetFlowState, resetStory, stopDialogue])

  const debugGoToDoorPassage = useCallback(() => {
    stopDialogue()
    resetFlowState()
    setLoaderFading(false)
    setPostIntro(true)
    setIntroSpawn(INSIDE_POV)
    setIntroMovementLocked(true)
    startStory('intro.treeWelcome')
    playDialogue('dialogue1', {
      onDone: () => {
        completeStep('intro.treeWelcome')
        setShowNameInput(true)
      },
    })
  }, [completeStep, playDialogue, resetFlowState, startStory, stopDialogue])

  const debugGoToReception = useCallback(() => {
    stopDialogue()
    resetFlowState()
    setLoaderFading(false)
    setPostIntro(true)
    setIntroSpawn(INSIDE_POV)
    setIntroMovementLocked(true)
    setPlayerName('Debug')
    goToStep('intro.goToReception')
  }, [goToStep, resetFlowState, stopDialogue])

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
    storyCameraTransition,
    introPending,
    introShouldAdvance,
    introWaitingAtDoor,
    journalAutoOpenToken,
    journalCloseToken,
    journalPuzzleEnabled,
    loaderFading,
    journalUnlocked,
    playerName,
    postIntro,
    receptionChoiceVisible,
    returnHallVisible,
    showNameInput,
    storyReady,
    currentStoryStepId: currentStepId,
    dismissLoader,
    exitIntro,
    handleIntroEvent,
    handleLoaderClick,
    handleLoaderKeyDown,
    handleNameSubmit,
    handleDebugGoToDoorPassage: debugGoToDoorPassage,
    handleDebugGoToIntroStart: debugGoToIntroStart,
    handleDebugGoToReception: debugGoToReception,
    handleJournalOpen,
    handleJournalPiecePlaced,
    handleReceptionChoice,
    handleReceptionInteract,
    handleReturnToHall,
    handleStoryCameraTransitionComplete,
    launchIntro,
    playDialogue,
    setPostIntro,
  }
}
