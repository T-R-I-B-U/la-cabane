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
  pointerControlsRef,
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
        controlsRef={pointerControlsRef}
      />
    )
  }

  if (postIntro) {
    return postIntroLocked ? (
      <PlayerControls
        canMove={!movementLocked}
        collisionObjects={collisionObjects}
        controlsRef={pointerControlsRef}
      />
    ) : null
  }

  return (
    <OrbitControls
      ref={controlsRef}
      target={hutPosition}
      enablePan={false}
      enableDamping
      minDistance={10}
      maxDistance={80}
      maxPolarAngle={Math.PI / 2.1}
    />
  )
}
