import { OrbitControls } from '@react-three/drei'
import IntroCamera from '../../world/entities/IntroCamera'
import { PlayerControls } from '../PlayerControls'

export function SceneControls({
  collisionObjects,
  introActive,
  introShouldAdvance,
  onIntroEvent,
  playerMode,
  flyMode,
  playerSpawn,
  playerSpawnKey,
  movementLocked,
  postIntro,
  postIntroLocked,
  controlsRef,
  hutPosition,
}) {
  if (introActive) {
    return (
      <IntroCamera active={introActive} shouldAdvance={introShouldAdvance} onEvent={onIntroEvent} />
    )
  }

  if (playerMode) {
    return (
        <PlayerControls
          key={playerSpawnKey}
          canMove={!movementLocked}
          flyMode={flyMode}
          spawnAt={playerSpawn}
          collisionObjects={collisionObjects}
        />
    )
  }

  if (postIntro) {
    return postIntroLocked ? (
      <PlayerControls canMove={!movementLocked} flyMode={flyMode} collisionObjects={collisionObjects} />
    ) : null
  }

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={0.5}
      maxDistance={200}
      target={hutPosition}
    />
  )
}
