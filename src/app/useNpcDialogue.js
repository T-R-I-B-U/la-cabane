import { useCallback, useState } from 'react'

export function useNpcDialogue({ playDialogue, interactionLocked }) {
  const [marieClip, setMarieClip] = useState('marie-standiing-idle')
  const [thomasClip, setThomasClip] = useState('thomas-front')
  const [npcHovered, setNpcHovered] = useState(false)

  const handleNpcInteract = useCallback(
    (npcId) => {
      if (interactionLocked) return

      playDialogue(npcId === 'marie' ? 'marieDialogue' : 'thomasDialogue')
    },
    [interactionLocked, playDialogue]
  )

  return {
    handleNpcInteract,
    marieClip,
    npcHovered,
    setMarieClip,
    setNpcHovered,
    setThomasClip,
    thomasClip,
  }
}
