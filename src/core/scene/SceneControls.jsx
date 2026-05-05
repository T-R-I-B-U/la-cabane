import { OrbitControls } from '@react-three/drei'
import IntroCamera from '../../world/entities/IntroCamera'
import { CameraRegistrySync } from '../CameraRegistrySync'
import { PlayerControls } from '../PlayerControls'

export function SceneControls({
  collisionObjects,
  introActive,
  introShouldAdvance,
  introSpawn,
  onIntroEvent,
  playerMode,
  flyMode,
  playerSpawn,
  playerSpawnKey,
  movementLocked,
  postIntro,
  pointerControlsRef,
  controlsRef,
  hutPosition,
}) {
  const devSync = import.meta.env.DEV ? <CameraRegistrySync controlsRef={controlsRef} /> : null

  if (introActive) {
    return (
      <>
        <IntroCamera active={introActive} shouldAdvance={introShouldAdvance} onEvent={onIntroEvent} />
        {devSync}
      </>
    )
  }

  if (playerMode) {
    return (
      <>
        <PlayerControls
          key={playerSpawnKey}
          canMove={!movementLocked}
          flyMode={flyMode}
          spawnAt={playerSpawn}
          collisionObjects={collisionObjects}
          controlsRef={pointerControlsRef}
        />
        {devSync}
      </>
    )
  }

  if (postIntro) {
    return (
      <>
        <PlayerControls
          canMove={!movementLocked}
          flyMode={flyMode}
          spawnAt={introSpawn?.position}
          collisionObjects={collisionObjects}
          controlsRef={pointerControlsRef}
        />
        {devSync}
      </>
    )
  }

  return (
    <>
      <OrbitControls
        ref={controlsRef}
        target={hutPosition}
        enablePan
        enableDamping
        minDistance={0.5}
        maxDistance={500}
      />
      {devSync}
    </>
  )
}
