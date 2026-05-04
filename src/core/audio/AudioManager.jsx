import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { initAudio } from '../../utils'

// Doit être monté à l'intérieur du Canvas — appelle initAudio(camera) une fois,
// ce qui crée l'AudioListener et charge toutes les tracks de audioConfig.json.
export default function AudioManager() {
  const { camera } = useThree()
  useEffect(() => {
    initAudio(camera)
  }, [camera])
  return null
}
