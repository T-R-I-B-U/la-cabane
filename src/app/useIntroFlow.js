import { useCallback, useEffect, useRef, useState } from 'react'
import { useNpcDialogue } from './useNpcDialogue'
import { DEFAULT_STORY_CAMERA_POVS, STORY_CAMERA_POVS } from './storyCameraPovs'
import { useStoryFlow } from './useStoryFlow'
import { fade, stop } from '../utils/audioStore'

const INSIDE_POV = {
  position: { x: -14.3667, y: 1.3785, z: -5.1169 },
  target: { x: -12.5066, y: 1.7137, z: -5.2008 },
}

const RASPBERRY_TEMP_COMPLETE_COUNT = 8
const RASPBERRY_TEMP_AUTO_COMPLETE_DELAY = 2000

export function useIntroFlow({ sceneReady, arbreActiveRef, modalActiveRef }) {
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
  const [treePhaseActive, setTreePhaseActive] = useState(false)
  const [timeatmPhaseActive, setTimeatmPhaseActive] = useState(false)
  const [, setEtabliPhaseActive] = useState(false)
  const [workbenchPhaseActive, setWorkbenchPhaseActive] = useState(false)
  const [greenhousePhaseActive, setGreenhousePhaseActive] = useState(false)
  const [thomasEtabliPhaseActive, setThomasEtabliPhaseActive] = useState(false)
  const [thomasAnimationPhase, setThomasAnimationPhase] = useState('back')
  const [serreActive, setSerreActive] = useState(false)
  const [zoePhaseActive, setZoePhaseActive] = useState(false)
  const [raspberryPhaseActive, setRaspberryPhaseActive] = useState(false)
  const [juiceMachinePhaseActive, setJuiceMachinePhaseActive] = useState(false)
  const [juicePipePlaying, setJuicePipePlaying] = useState(false)
  const [juicePhaseActive, setJuicePhaseActive] = useState(false)
  const [exitSerrePhaseActive, setExitSerrePhaseActive] = useState(false)
  const [arbreLadderPending, setArbreLadderPending] = useState(false)
  const [zoeClip, setZoeClip] = useState(null)
  const [minigameCount, setMinigameCount] = useState(0)
  const [playerName, setPlayerName] = useState('')
  const raspberryPhaseActiveRef = useRef(false)
  const journalPlacedCountRef = useRef(0)
  const journalCompletedRef = useRef(false)
  const isPostBookTransitionRef = useRef(false)
  const treeClickPhaseRef = useRef(1)
  const isEtabliTransitionRef = useRef(false)
  const isThomasTransitionRef = useRef(false)
  const isAtelierBetweenTransitionRef = useRef(false)
  const isSerreZoeTransitionRef = useRef(false)
  const isSerreRaspberryTransitionRef = useRef(false)
  const isSerreJuiceTransitionRef = useRef(false)
  const isSerreJuiceDrinkTransitionRef = useRef(false)
  const greenhouseTransitionStageRef = useRef(null)
  const scheduledTimeoutsRef = useRef(new Set())
  const { dialogueActive, playDialogue, stopDialogue, skipDialogue } = useNpcDialogue()
  const { currentStepId, completeStep, goToStep, resetStory, startStory } = useStoryFlow()
  const storyReady = currentStepId === 'intro.goToReception'

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

  useEffect(() => clearScheduledTimeouts, [clearScheduledTimeouts])

  useEffect(() => {
    raspberryPhaseActiveRef.current = raspberryPhaseActive
  }, [raspberryPhaseActive])

  const resetFlowState = useCallback(() => {
    clearScheduledTimeouts()
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
    setTreePhaseActive(false)
    setEtabliPhaseActive(false)
    setWorkbenchPhaseActive(false)
    setThomasEtabliPhaseActive(false)
    setGreenhousePhaseActive(false)
    setThomasAnimationPhase('back')
    setSerreActive(false)
    setZoePhaseActive(false)
    setRaspberryPhaseActive(false)
    setJuiceMachinePhaseActive(false)
    setJuicePhaseActive(false)
    setExitSerrePhaseActive(false)
    setArbreLadderPending(false)
    setZoeClip(null)
    setMinigameCount(0)
    setPlayerName('')
    stop('ambianceWorkbench')
    stop('ambianceGreenhouse')
    journalPlacedCountRef.current = 0
    journalCompletedRef.current = false
    isPostBookTransitionRef.current = false
    isSerreZoeTransitionRef.current = false
    isSerreRaspberryTransitionRef.current = false
    isSerreJuiceTransitionRef.current = false
    isSerreJuiceDrinkTransitionRef.current = false
    greenhouseTransitionStageRef.current = null
  }, [clearScheduledTimeouts])

  const exitIntro = useCallback(() => {
    resetFlowState()
    resetStory()
    stopDialogue()
  }, [resetFlowState, resetStory, stopDialogue])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code === 'Escape' && !modalActiveRef?.current) exitIntro()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [exitIntro, modalActiveRef])

  useEffect(() => {
    if (!postIntro) return

    let wasLocked = false
    const onPointerLockChange = () => {
      if (document.pointerLockElement) wasLocked = true
      else if (raspberryPhaseActiveRef.current) {
        // minigame owns the pointer — ignore spontaneous unlocks
      } else if (arbreActiveRef?.current) {
        // arbre sequence owns the pointer — ignore spontaneous unlocks
      } else if (modalActiveRef?.current) {
        // savoir/contact panel owns the pointer — ignore spontaneous unlocks
      } else if (wasLocked) {
        exitIntro()
      }
    }

    document.addEventListener('pointerlockchange', onPointerLockChange)
    return () => document.removeEventListener('pointerlockchange', onPointerLockChange)
  }, [postIntro, exitIntro, arbreActiveRef, modalActiveRef])

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
        playDialogue('01-voice-tree', {
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
      playDialogue('02-voice-tree', {
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

    if (isPostBookTransitionRef.current) {
      isPostBookTransitionRef.current = false
      setTreePhaseActive(true)
      return
    }

    if (isEtabliTransitionRef.current) {
      isEtabliTransitionRef.current = false
      playDialogue('etabliDialogue', {
        onDone: () => {
          setThomasEtabliPhaseActive(true)
        },
      })
      return
    }

    if (isAtelierBetweenTransitionRef.current) {
      isAtelierBetweenTransitionRef.current = false
      scheduleFlowTimeout(() => {
        isThomasTransitionRef.current = true
        setStoryCameraTransition({ ...STORY_CAMERA_POVS.talkThomas, duration: 1.5 })
      }, 1000)
      return
    }

    if (isThomasTransitionRef.current) {
      isThomasTransitionRef.current = false
      playDialogue('thomasEtabliDialogue', {
        onDone: () => {
          setThomasAnimationPhase('returning')
          scheduleFlowTimeout(() => fade('ambianceWorkbench', 0.7, 2000), 2000)
          setGreenhousePhaseActive(true)
        },
      })
      return
    }

    if (isSerreZoeTransitionRef.current) {
      isSerreZoeTransitionRef.current = false
      playDialogue('zoeIntro', {
        onDone: () => {
          isSerreRaspberryTransitionRef.current = true
          setRaspberryPhaseActive(true)
          setStoryCameraTransition({ ...STORY_CAMERA_POVS.serreRaspberry, duration: 1.0 })
        },
      })
      return
    }

    if (isSerreRaspberryTransitionRef.current) {
      isSerreRaspberryTransitionRef.current = false
      return
    }

    if (isSerreJuiceTransitionRef.current) {
      isSerreJuiceTransitionRef.current = false
      return
    }

    if (isSerreJuiceDrinkTransitionRef.current) {
      isSerreJuiceDrinkTransitionRef.current = false
      return
    }

    if (greenhouseTransitionStageRef.current === 'exitIndoor') {
      greenhouseTransitionStageRef.current = 'exitCorridor'
      scheduleFlowTimeout(() => {
        setStoryCameraTransition({ ...STORY_CAMERA_POVS.greenhouseCorridorExit, duration: 2.5 })
      }, 1000)
      return
    }

    if (greenhouseTransitionStageRef.current === 'exitCorridor') {
      greenhouseTransitionStageRef.current = 'exitFront'
      scheduleFlowTimeout(() => {
        setStoryCameraTransition({ ...STORY_CAMERA_POVS.greenhouseFrontDoorExit, duration: 2.5 })
      }, 1000)
      return
    }

    if (greenhouseTransitionStageRef.current === 'exitFront') {
      greenhouseTransitionStageRef.current = null
      scheduleFlowTimeout(() => {
        playDialogue('18-voice-tree', {
          onDone: () =>
            playDialogue('19-voice-tree', { onDone: () => setArbreLadderPending(true) }),
        })
        scheduleFlowTimeout(() => {
          greenhouseTransitionStageRef.current = 'arbreStairs1'
          setStoryCameraTransition({ ...STORY_CAMERA_POVS.stairs01Floor, duration: 2.0 })
        }, 2000)
      }, 500)
      return
    }

    if (greenhouseTransitionStageRef.current === 'arbreStairs1') {
      greenhouseTransitionStageRef.current = 'arbreStairs2'
      scheduleFlowTimeout(() => {
        setStoryCameraTransition({ ...STORY_CAMERA_POVS.stairs01Top, duration: 2.0 })
      }, 2000)
      return
    }

    if (greenhouseTransitionStageRef.current === 'arbreStairs2') {
      greenhouseTransitionStageRef.current = null
      return
    }

    if (greenhouseTransitionStageRef.current === 'front') {
      greenhouseTransitionStageRef.current = 'corridor'
      scheduleFlowTimeout(() => {
        setStoryCameraTransition({ ...STORY_CAMERA_POVS.greenhouseCorridor, duration: 2.5 })
      }, 1000)
      return
    }

    if (greenhouseTransitionStageRef.current === 'corridor') {
      greenhouseTransitionStageRef.current = 'inside'
      fade('ambianceGreenhouse', 0.7, 2000)
      scheduleFlowTimeout(() => {
        setStoryCameraTransition({ ...STORY_CAMERA_POVS.greenhouseInside, duration: 2.5 })
      }, 1000)
      return
    }

    if (greenhouseTransitionStageRef.current === 'inside') {
      greenhouseTransitionStageRef.current = null
      scheduleFlowTimeout(() => {
        playDialogue('serreNarration', {
          onDone: () => setZoePhaseActive(true),
        })
      }, 500)
      return
    }

    completeStep('intro.goToReception')
    playDialogue('receptionDialogue', {
      onDone: () => {
        setReceptionChoiceVisible(true)
      },
    })
  }, [completeStep, playDialogue, scheduleFlowTimeout, storyCameraTransition])

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

      journalPlacedCountRef.current += 1
      const isLast = journalPlacedCountRef.current >= 4

      setJournalPuzzleEnabled(false)
      playDialogue(dialogueId, {
        onDone: () => {
          if (isLast) {
            journalCompletedRef.current = true
            setJournalCloseToken((t) => t + 1)
            return
          }

          setJournalPuzzleEnabled(true)
        },
      })
    },
    [playDialogue]
  )

  const handleJournalInteractionStart = useCallback(() => {}, [])

  const suspendPointerUnlockExit = useCallback(() => {}, [])

  const handleJournalEnd = useCallback(() => {
    const completed = journalCompletedRef.current
    journalCompletedRef.current = false
    setJournalUnlocked(false)

    if (completed) {
      isPostBookTransitionRef.current = true
      setStoryCameraTransition({ ...STORY_CAMERA_POVS.apresAccueil, duration: 2.0 })
      return true
    }

    return false
  }, [])

  const unlockWorkbenchPhase = useCallback(() => {
    setEtabliPhaseActive(true)
    setWorkbenchPhaseActive(true)
  }, [])

  const handleTreeInteract = useCallback(() => {
    setTreePhaseActive(false)

    if (treeClickPhaseRef.current === 1) {
      playDialogue('treePiedDialogue', {
        onDone: () => {
          playDialogue('treeRacinesDialogue', {
            onDone: () => {
              setTimeatmPhaseActive(true)
            },
          })
        },
      })
    } else {
      playDialogue('treeArbreDialogue', {
        onDone: () => {
          playDialogue('treeOutroDialogue', {
            onDone: unlockWorkbenchPhase,
          })
        },
      })
    }
  }, [playDialogue, unlockWorkbenchPhase])

  const handleTimeatmInteract = useCallback(() => {
    setTimeatmPhaseActive(false)
    playDialogue('treeBorneDialogue', {
      onDone: () => {
        treeClickPhaseRef.current = 2
        setTreePhaseActive(true)
      },
    })
  }, [playDialogue])

  const handleWorkbenchInteract = useCallback(() => {
    setWorkbenchPhaseActive(false)
    fade('ambianceWorkbench', 0.7, 800)
    isEtabliTransitionRef.current = true
    setStoryCameraTransition({ ...STORY_CAMERA_POVS.atelier, duration: 1.5 })
  }, [])

  const handleZoeTalk = useCallback(() => {
    setZoePhaseActive(false)
    isSerreZoeTransitionRef.current = true
    setStoryCameraTransition({ ...STORY_CAMERA_POVS.serreZoe, duration: 1.0 })
  }, [])

  const handleMinigameStateChange = useCallback(
    (state) => {
      setMinigameCount(state.count)
      if (!state.complete) return
      setRaspberryPhaseActive(false)
      setZoeClip('zoe-pointing')
      scheduleFlowTimeout(() => {
        playDialogue('zoeJuice', {
          onDone: () => {
            setJuiceMachinePhaseActive(true)
            isSerreJuiceTransitionRef.current = true
            setStoryCameraTransition({ ...STORY_CAMERA_POVS.serreJuice, duration: 1.5 })
          },
        })
      }, 500)
    },
    [playDialogue, scheduleFlowTimeout]
  )

  useEffect(() => {
    if (!raspberryPhaseActive) return undefined

    const scheduledTimeouts = scheduledTimeoutsRef.current

    const timeoutId = scheduleFlowTimeout(() => {
      handleMinigameStateChange({
        active: true,
        count: RASPBERRY_TEMP_COMPLETE_COUNT,
        complete: true,
      })
    }, RASPBERRY_TEMP_AUTO_COMPLETE_DELAY)

    return () => {
      clearTimeout(timeoutId)
      scheduledTimeouts.delete(timeoutId)
    }
  }, [handleMinigameStateChange, raspberryPhaseActive, scheduleFlowTimeout])

  const handleUnripeAttempt = useCallback(() => {
    playDialogue('zoeUnripe')
  }, [playDialogue])

  const handleJuiceMachineInteract = useCallback(() => {
    setJuiceMachinePhaseActive(false)
    scheduleFlowTimeout(() => setJuicePipePlaying(true), 1000)
  }, [scheduleFlowTimeout])

  const handleJuicePipeComplete = useCallback(() => {
    setJuicePipePlaying(false)
    setJuicePhaseActive(true)
    isSerreJuiceDrinkTransitionRef.current = true
    setStoryCameraTransition({ ...STORY_CAMERA_POVS.serreJuiceDrink, duration: 1.5 })
  }, [setStoryCameraTransition])

  const handleJuiceInteract = useCallback(() => {
    setJuicePhaseActive(false)
    playDialogue('zoeFarewell', {
      onDone: () => setExitSerrePhaseActive(true),
    })
  }, [playDialogue])

  const handleGreenhouseDoorClick = useCallback(() => {
    setGreenhousePhaseActive(false)
    setSerreActive(true)
    fade('ambianceWorkbench', 0, 1500)
    greenhouseTransitionStageRef.current = 'front'
    setStoryCameraTransition({ ...STORY_CAMERA_POVS.greenhouseFrontDoor, duration: 3.0 })
  }, [])

  const handleExitSerreDoorClick = useCallback(() => {
    setExitSerrePhaseActive(false)
    fade('ambianceGreenhouse', 0, 1500)
    greenhouseTransitionStageRef.current = 'exitIndoor'
    setStoryCameraTransition({ ...STORY_CAMERA_POVS.greenhouseInsideExit, duration: 2.0 })
  }, [])

  const handleThomasEtabliInteract = useCallback(() => {
    setThomasEtabliPhaseActive(false)
    setThomasAnimationPhase('talking')
    fade('ambianceWorkbench', 0, 1500)
    isAtelierBetweenTransitionRef.current = true
    setStoryCameraTransition({ ...STORY_CAMERA_POVS.atelierBetween, duration: 1.0 })
  }, [])

  const handleReturnToHall = useCallback(() => {
    setReturnHallVisible(false)
    setJournalPuzzleEnabled(false)
    setJournalCloseToken((token) => token + 1)
  }, [])

  const prepareDebugStoryState = useCallback(() => {
    stopDialogue()
    resetFlowState()
    setLoaderFading(true)
  }, [resetFlowState, stopDialogue])

  const prepareDebugPostIntroState = useCallback(
    (lockMovement = true) => {
      stopDialogue()
      resetFlowState()
      setLoaderFading(false)
      setPostIntro(true)
      setIntroSpawn(INSIDE_POV)
      setIntroMovementLocked(lockMovement)
      setPlayerName('Debug')
    },
    [resetFlowState, stopDialogue]
  )

  const debugGoToIntroStart = useCallback(() => {
    prepareDebugStoryState()
    resetStory()
    setIntroActive(true)
  }, [prepareDebugStoryState, resetStory])

  // 2. Player just entered the cabin — tree welcome dialogue, movement locked
  const debugGoToBienvenue = useCallback(() => {
    prepareDebugPostIntroState()
    setPlayerName('')
    startStory('intro.treeWelcome')
    playDialogue('01-voice-tree', {
      onDone: () => {
        completeStep('intro.treeWelcome')
        setShowNameInput(true)
      },
    })
  }, [completeStep, playDialogue, prepareDebugPostIntroState, startStory])

  // 3. At the reception desk
  const debugGoToAccueil = useCallback(() => {
    prepareDebugPostIntroState()
    const pov = DEFAULT_STORY_CAMERA_POVS.accueil
    if (pov?.position) setIntroSpawn(pov)
    goToStep('intro.goToReception')
  }, [goToStep, prepareDebugPostIntroState])

  // 4. Journal unlocked, auto-opens so the puzzle is immediately available
  const debugGoToJournal = useCallback(() => {
    prepareDebugPostIntroState(false)
    const pov = DEFAULT_STORY_CAMERA_POVS.accueil
    if (pov?.position) setIntroSpawn(pov)
    setJournalUnlocked(true)
    setJournalPuzzleEnabled(true)
    setJournalAutoOpenToken((t) => t + 1)
  }, [prepareDebugPostIntroState])

  // 5. Tree dialogues phase 1, after the journal
  const debugGoToArbreApresJournal = useCallback(() => {
    prepareDebugPostIntroState()
    const pov = DEFAULT_STORY_CAMERA_POVS.apresAccueil
    if (pov?.position) setIntroSpawn(pov)
    treeClickPhaseRef.current = 1
    setTreePhaseActive(true)
  }, [prepareDebugPostIntroState])

  // 6. Workbench interactable
  const debugGoToEtabli = useCallback(() => {
    prepareDebugPostIntroState()
    const pov = DEFAULT_STORY_CAMERA_POVS.atelier
    if (pov?.position) setIntroSpawn(pov)
    unlockWorkbenchPhase()
  }, [prepareDebugPostIntroState, unlockWorkbenchPhase])

  // 7. Thomas at the workbench, ready to be talked to
  const debugGoToThomasEtabli = useCallback(() => {
    prepareDebugPostIntroState()
    const pov = DEFAULT_STORY_CAMERA_POVS.atelier
    if (pov?.position) setIntroSpawn(pov)
    setThomasEtabliPhaseActive(true)
  }, [prepareDebugPostIntroState])

  // 8. Greenhouse front door, ready to enter
  const debugGoToSerre = useCallback(() => {
    prepareDebugPostIntroState()
    const pov = DEFAULT_STORY_CAMERA_POVS.greenhouseFrontDoor
    if (pov?.position) setIntroSpawn(pov)
    setSerreActive(true)
    setGreenhousePhaseActive(true)
  }, [prepareDebugPostIntroState])

  // 9. Inside greenhouse, Zoé ready to talk
  const debugGoToZoeSerre = useCallback(() => {
    prepareDebugPostIntroState()
    const pov = DEFAULT_STORY_CAMERA_POVS.serreZoe
    if (pov?.position) setIntroSpawn(pov)
    setSerreActive(true)
    setZoePhaseActive(true)
  }, [prepareDebugPostIntroState])

  // 10. Raspberry minigame
  const debugGoToMinijeu = useCallback(() => {
    prepareDebugPostIntroState()
    const pov = DEFAULT_STORY_CAMERA_POVS.serreRaspberry
    if (pov?.position) setIntroSpawn(pov)
    setSerreActive(true)
    setRaspberryPhaseActive(true)
  }, [prepareDebugPostIntroState])

  // 11. Juice machine interaction
  const debugGoToJuiceMachine = useCallback(() => {
    prepareDebugPostIntroState()
    const pov = DEFAULT_STORY_CAMERA_POVS.serreJuice
    if (pov?.position) setIntroSpawn(pov)
    setSerreActive(true)
    setJuiceMachinePhaseActive(true)
  }, [prepareDebugPostIntroState])

  // 12. Exiting greenhouse, heading to the tree
  const debugGoToSortieSerre = useCallback(() => {
    prepareDebugPostIntroState()
    const pov = DEFAULT_STORY_CAMERA_POVS.greenhouseFrontDoorExit
    if (pov?.position) setIntroSpawn(pov)
    setSerreActive(true)
    scheduleFlowTimeout(() => {
      playDialogue('18-voice-tree', {
        onDone: () => playDialogue('19-voice-tree', { onDone: () => setArbreLadderPending(true) }),
      })
      scheduleFlowTimeout(() => {
        greenhouseTransitionStageRef.current = 'arbreStairs1'
        setStoryCameraTransition({ ...DEFAULT_STORY_CAMERA_POVS.stairs01Floor, duration: 2.0 })
      }, 2000)
    }, 500)
  }, [prepareDebugPostIntroState, playDialogue, scheduleFlowTimeout])

  const launchIntro = useCallback(() => {
    if (!sceneReady) return

    setPostIntro(false)
    setShowNameInput(false)
    resetStory()
    setIntroPending(true)
  }, [resetStory, sceneReady])

  // Combined auto-start: prepares state AND activates the camera sequence without
  // waiting for a user click (no loaderFading guard needed since there is no IntroLoader).
  const startIntro = useCallback(() => {
    if (!sceneReady) return

    setPostIntro(false)
    setShowNameInput(false)
    resetStory()
    setIntroPending(true)
    setIntroDoorOpen(false)
    setIntroWaitingAtDoor(false)
    setIntroShouldAdvance(false)
    setIntroActive(true)
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
    treePhaseActive,
    timeatmPhaseActive,
    workbenchPhaseActive,
    thomasEtabliPhaseActive,
    greenhousePhaseActive,
    thomasAnimPhase: thomasAnimationPhase,
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
    currentStoryStepId: currentStepId,
    dismissLoader,
    exitIntro,
    handleIntroEvent,
    handleLoaderClick,
    handleLoaderKeyDown,
    handleNameSubmit,
    handleDebugGoToIntroStart: debugGoToIntroStart,
    handleDebugGoToBienvenue: debugGoToBienvenue,
    handleDebugGoToAccueil: debugGoToAccueil,
    handleDebugGoToJournal: debugGoToJournal,
    handleDebugGoToArbreApresJournal: debugGoToArbreApresJournal,
    handleDebugGoToEtabli: debugGoToEtabli,
    handleDebugGoToThomasEtabli: debugGoToThomasEtabli,
    handleDebugGoToSerre: debugGoToSerre,
    handleDebugGoToZoeSerre: debugGoToZoeSerre,
    handleDebugGoToMinijeu: debugGoToMinijeu,
    handleDebugGoToJuiceMachine: debugGoToJuiceMachine,
    handleDebugGoToSortieSerre: debugGoToSortieSerre,
    handleWorkbenchInteract,
    handleThomasEtabliInteract,
    handleGreenhouseDoorClick,
    handleExitSerreDoorClick,
    handleZoeTalk,
    handleMinigameStateChange,
    handleUnripeAttempt,
    handleJuiceMachineInteract,
    handleJuicePipeComplete,
    handleJuiceInteract,
    handleJournalEnd,
    handleTreeInteract,
    handleTimeatmInteract,
    handleJournalInteractionStart,
    suspendPointerUnlockExit,
    handleJournalOpen,
    handleJournalPiecePlaced,
    handleReceptionChoice,
    handleReceptionInteract,
    handleReturnToHall,
    handleStoryCameraTransitionComplete,
    launchIntro,
    startIntro,
    playDialogue,
    skipDialogue,
    setPostIntro,
  }
}
