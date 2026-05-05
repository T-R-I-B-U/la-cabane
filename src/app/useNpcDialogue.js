import { useCallback, useRef, useState } from 'react'
import { playDialogue as playStoreDialogue, stopDialogue as stopStoreDialogue } from '../utils'

// Couche React minimale pour piloter le dialogue applicatif.
// Le hook expose un état local simple et délègue la lecture réelle au store audio global.
export function useNpcDialogue() {
  const [dialogueActive, setDialogueActive] = useState(false)
  const playbackTokenRef = useRef(0)

  const stopDialogue = useCallback(() => {
    playbackTokenRef.current += 1
    setDialogueActive(false)
    stopStoreDialogue()
  }, [])

  const playDialogue = useCallback((id, { onDone } = {}) => {
    const token = playbackTokenRef.current + 1
    playbackTokenRef.current = token
    setDialogueActive(true)

    playStoreDialogue(id, {
      onDone: () => {
        if (playbackTokenRef.current !== token) return
        setDialogueActive(false)
        onDone?.()
      },
    })
  }, [])

  return {
    dialogueActive,
    playDialogue,
    stopDialogue,
  }
}
