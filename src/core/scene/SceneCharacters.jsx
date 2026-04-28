import { Suspense } from 'react'
import { AnimatedCharacter } from '../../world/entities/AnimatedCharacter'
import { FLOOR_Y } from '../SceneConfig'

export function SceneCharacters({ hutPosition, marieClip, thomasClip }) {
  return (
    <Suspense fallback={null}>
      <AnimatedCharacter
        url="/models/marie-animated.glb"
        clip={marieClip}
        textureName="marie"
        position={[hutPosition[0] - 2.4, FLOOR_Y, hutPosition[2] - 8.5]}
        rotation={[0, Math.PI * 0.2, 0]}
        scale={9}
      />
      <AnimatedCharacter
        url="/models/thomas-animated.glb"
        clip={thomasClip}
        textureName="thomas"
        position={[hutPosition[0] - 1.1, FLOOR_Y, hutPosition[2] - 8.5]}
        rotation={[0, Math.PI * 1.2, 0]}
        scale={9}
      />
    </Suspense>
  )
}
