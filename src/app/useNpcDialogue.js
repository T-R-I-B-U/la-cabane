import { useCallback, useRef, useState } from 'react'
import {
  playDialogue as playStoreDialogue,
  stopDialogue as stopStoreDialogue,
} from '../utils/audioStore'

// Couche React minimale pour piloter le dialogue applicatif.
// Le hook expose un état local simple et délègue la lecture réelle au store audio global.
export function useNpcDialogue() {
  const [dialogueActive, setDialogueActive] = useState(false)
  const playbackTokenRef = useRef(0)
  const pendingOnDoneRef = useRef(null)

  const stopDialogue = useCallback(() => {
    playbackTokenRef.current += 1
    pendingOnDoneRef.current = null
    setDialogueActive(false)
    stopStoreDialogue()
  }, [])

  const skipDialogue = useCallback(() => {
    const pending = pendingOnDoneRef.current
    pendingOnDoneRef.current = null
    playbackTokenRef.current += 1
    stopStoreDialogue()
    setDialogueActive(false)
    pending?.()
  }, [])

  const playDialogue = useCallback((id, { onDone, onLastCue } = {}) => {
    const token = playbackTokenRef.current + 1
    playbackTokenRef.current = token
    setDialogueActive(true)
    pendingOnDoneRef.current = onDone ?? null

    playStoreDialogue(id, {
      onLastCue,
      onDone: () => {
        if (playbackTokenRef.current !== token) return
        pendingOnDoneRef.current = null
        setDialogueActive(false)
        onDone?.()
      },
    })
  }, [])

  return {
    dialogueActive,
    playDialogue,
    stopDialogue,
    skipDialogue,
  }
}
