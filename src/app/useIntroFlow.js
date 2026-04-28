import { useCallback, useEffect, useRef, useState } from 'react'
import { playDialogue as playStoreDialogue, stopDialogue } from '../utils/audioStore'

export function useIntroFlow({ sceneReady }) {
  const [introActive, setIntroActive] = useState(false)
  const [introDoorOpen, setIntroDoorOpen] = useState(false)
  const [introWaitingAtDoor, setIntroWaitingAtDoor] = useState(false)
  const [introShouldAdvance, setIntroShouldAdvance] = useState(false)
  const [introPending, setIntroPending] = useState(false)
  const [postIntro, setPostIntro] = useState(false)
  const [showNameInput, setShowNameInput] = useState(false)
  const [loaderFading, setLoaderFading] = useState(false)
  const [dialogueActive, setDialogueActive] = useState(false)
  const [introMovementLocked, setIntroMovementLocked] = useState(false)
  const ignoreNextPointerUnlockRef = useRef(false)

  const playDialogue = useCallback((id, { onDone } = {}) => {
    setDialogueActive(true)
    playStoreDialogue(id, {
      onDone: () => {
        setDialogueActive(false)
        onDone?.()
      },
    })
  }, [])

  const exitIntro = useCallback(() => {
    setIntroActive(false)
    setIntroPending(false)
    setPostIntro(false)
    setShowNameInput(false)
    setIntroDoorOpen(false)
    setIntroWaitingAtDoor(false)
    setIntroShouldAdvance(false)
    setDialogueActive(false)
    setIntroMovementLocked(false)
    ignoreNextPointerUnlockRef.current = false
    stopDialogue()
  }, [])

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
    const hideCursor = introActive && !introWaitingAtDoor
    document.body.style.cursor = hideCursor ? 'none' : ''

    return () => {
      document.body.style.cursor = ''
    }
  }, [introActive, introWaitingAtDoor])

  useEffect(() => {
    if (!showNameInput || !document.pointerLockElement) return

    ignoreNextPointerUnlockRef.current = true
    document.exitPointerLock()
  }, [showNameInput])

  const handleIntroEvent = useCallback(
    (event) => {
      if (event === 'wait:door') setIntroWaitingAtDoor(true)

      if (event === 'door:clicked') {
        setIntroWaitingAtDoor(false)
        setIntroShouldAdvance(true)
      }

      if (event === 'door:open') setIntroDoorOpen(true)

      if (event === 'inside') {
        setIntroDoorOpen(false)
        setIntroShouldAdvance(false)
        setIntroActive(false)
        setPostIntro(true)
        setIntroMovementLocked(true)
        playDialogue('dialogue1', {
          onDone: () => setShowNameInput(true),
        })
      }
    },
    [playDialogue]
  )

  const handleNameSubmit = useCallback(() => {
    setShowNameInput(false)
    setIntroMovementLocked(true)
    playDialogue('dialogue2', {
      onDone: () => setIntroMovementLocked(false),
    })
  }, [playDialogue])

  const launchIntro = useCallback(() => {
    if (!sceneReady) return

    setPostIntro(false)
    setShowNameInput(false)
    ignoreNextPointerUnlockRef.current = false
    setIntroPending(true)
  }, [sceneReady])

  const handleLoaderClick = useCallback(() => {
    if (!sceneReady || loaderFading) return

    setIntroDoorOpen(false)
    setIntroWaitingAtDoor(false)
    setIntroShouldAdvance(false)
    setIntroActive(true)
    setLoaderFading(true)
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
    introPending,
    introShouldAdvance,
    introWaitingAtDoor,
    loaderFading,
    postIntro,
    showNameInput,
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
