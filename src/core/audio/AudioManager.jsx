import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { detachAudio, initAudio } from '../../utils'

// Doit être monté à l'intérieur du Canvas.
// Crée l'AudioListener une fois puis le rattache à la caméra active si elle change.
export default function AudioManager() {
  const { camera } = useThree()

  useEffect(() => {
    initAudio(camera)

    return () => {
      detachAudio(camera)
    }
  }, [camera])

  return null
}
