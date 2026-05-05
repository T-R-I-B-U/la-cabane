import { useEffect } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import IntroCamera from '../../world/entities/IntroCamera'
import { CameraRegistrySync } from '../CameraRegistrySync'
import { PlayerControls } from '../PlayerControls'
import { StoryCameraTransition } from '../StoryCameraTransition'

function OrbitTargetSync({ controlsRef, target }) {
  const { camera } = useThree()

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return

    if (target) {
      controls.target.set(target[0], target[1], target[2])
      controls.update()
      return
    }

    const lookDirection = camera.getWorldDirection(controls.target)
    controls.target.copy(camera.position).add(lookDirection.multiplyScalar(5))
    controls.update()
  }, [camera, controlsRef, target])

  return null
}

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
    ) : (
      <>
        <OrbitControls
          ref={controlsRef}
          enablePan
          enableDamping
          minDistance={0.5}
          maxDistance={500}
        />
        <OrbitTargetSync controlsRef={controlsRef} />
        {devSync}
      </>
    )
  }

  return (
    <>
      <OrbitControls
        ref={controlsRef}
        enablePan
        enableDamping
        minDistance={0.5}
        maxDistance={500}
      />
      <OrbitTargetSync controlsRef={controlsRef} target={hutPosition} />
      {devSync}
    </>
  )
}
