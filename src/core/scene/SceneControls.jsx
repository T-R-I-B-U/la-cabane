import { OrbitControls } from '@react-three/drei'
import IntroCamera from '../../world/entities/IntroCamera'
import { CameraRegistrySync } from '../CameraRegistrySync'
import { PlayerControls } from '../PlayerControls'
import { StoryCameraTransition } from '../StoryCameraTransition'

export function SceneControls({
  collisionObjects,
  introActive,
  introShouldAdvance,
  introSpawn,
  storyCameraTransition,
  onStoryCameraTransitionComplete,
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
          lookAtTarget={null}
          collisionObjects={collisionObjects}
          controlsRef={pointerControlsRef}
        />
        {devSync}
      </>
    )
  }

  if (postIntro) {
    return postIntroLocked ? (
      <>
        <PlayerControls
          canMove={!movementLocked}
          flyMode={flyMode}
          spawnAt={introSpawn?.position}
          lookAtTarget={introSpawn?.target}
          collisionObjects={collisionObjects}
          controlsRef={pointerControlsRef}
        />
        <StoryCameraTransition
          transition={storyCameraTransition}
          onComplete={onStoryCameraTransitionComplete}
        />
        {devSync}
      </>
    ) : devSync
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
