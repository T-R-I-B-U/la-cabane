import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { detachAudio, initAudio } from '../../utils/audioStore'

// Pont entre la caméra R3F active et le store audio global.
// Doit être monté dans le Canvas pour fournir un AudioListener attaché à la bonne caméra.
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
