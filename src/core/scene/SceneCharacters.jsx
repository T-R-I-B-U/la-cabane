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
        position={[hutPosition[0] + 1.4, FLOOR_Y, hutPosition[2] - 9.1]}
        rotation={[0, Math.PI * 0.08, 0]}
        scale={9}
      />
      <AnimatedCharacter
        url="/models/thomas-animated.glb"
        clip={thomasClip}
        textureName="thomas"
        position={[hutPosition[0] + 2.7, FLOOR_Y, hutPosition[2] - 9.1]}
        rotation={[0, Math.PI * 1.04, 0]}
        scale={9}
      />
    </Suspense>
  )
}
