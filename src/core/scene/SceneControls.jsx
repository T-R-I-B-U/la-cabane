import { useEffect, useState } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import IntroCamera from '../../world/entities/IntroCamera'
import CameraEditorFlyControls from '../CameraEditorFlyControls'
import { CameraPreviewPlayer } from '../CameraPreviewPlayer'
import { CameraRegistrySync } from '../CameraRegistrySync'
import { getEditorFlyMode, onEditorFlyModeChange } from '../cameraRegistry'
import { PlayerControls } from '../PlayerControls'
import { StoryCameraTransition } from '../StoryCameraTransition'
import { StorySequencePlayer } from '../StorySequencePlayer'

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
  treeStoryCameras,
  treeStoryPauseAt,
  treeStoryCameraLocked,
  onTreeStoryPause,
  onTreeStoryComplete,
  arbreStoryCameraTransition,
  onArbreTransitionComplete,
  onIntroEvent,
  playerMode,
  flyMode,
  playerSpawn,
  playerSpawnTarget,
  playerEyeHeight,
  playerSpawnKey,
  movementLocked,
  postIntro,
  postIntroLocked,
  pointerControlsRef,
  controlsRef,
  hutPosition,
  cameraFixed,
  sensitivity = 1,
}) {
  const [editorFlyMode, setEditorFlyMode] = useState(getEditorFlyMode)

  useEffect(() => onEditorFlyModeChange(setEditorFlyMode), [])

  const devSync = import.meta.env.DEV ? (
    <>
      <CameraRegistrySync controlsRef={controlsRef} />
      <CameraEditorFlyControls />
      <CameraPreviewPlayer />
    </>
  ) : null

  if (introActive) {
    return (
      <>
        <IntroCamera
          active={introActive}
          shouldAdvance={introShouldAdvance}
          onEvent={onIntroEvent}
        />
        {devSync}
      </>
    )
  }

  if (playerMode) {
    return (
      <>
        <PlayerControls
          spawnKey={playerSpawnKey}
          canMove={!movementLocked}
          flyMode={flyMode}
          spawnAt={playerSpawn}
          lookAtTarget={playerSpawnTarget}
          eyeHeight={playerEyeHeight}
          collisionObjects={collisionObjects}
          controlsRef={pointerControlsRef}
          pointerSpeed={arbreStoryCameraTransition ? 0 : sensitivity}
        />
        {arbreStoryCameraTransition && (
          <StoryCameraTransition
            transition={arbreStoryCameraTransition}
            onComplete={onArbreTransitionComplete}
          />
        )}
        {devSync}
      </>
    )
  }

  if (postIntro) {
    return postIntroLocked ? (
      <>
        {!cameraFixed && (
          <PlayerControls
            canMove={!movementLocked && !treeStoryCameraLocked}
            flyMode={flyMode}
            spawnAt={introSpawn?.position}
            lookAtTarget={introSpawn?.target}
            collisionObjects={collisionObjects}
            controlsRef={pointerControlsRef}
            pointerSpeed={treeStoryCameraLocked ? 0 : sensitivity}
          />
        )}
        <StoryCameraTransition
          transition={storyCameraTransition}
          onComplete={onStoryCameraTransitionComplete}
        />
        {arbreStoryCameraTransition && (
          <StoryCameraTransition
            transition={arbreStoryCameraTransition}
            onComplete={onArbreTransitionComplete}
          />
        )}
        {treeStoryCameras && (
          <StorySequencePlayer
            cameras={treeStoryCameras}
            pauseAtId={treeStoryPauseAt}
            onPause={onTreeStoryPause}
            onComplete={onTreeStoryComplete}
          />
        )}
        {devSync}
      </>
    ) : (
      <>
        {!editorFlyMode && (
          <>
            <OrbitControls
              ref={controlsRef}
              enablePan
              enableDamping
              enableZoom={false}
              minDistance={0.5}
              maxDistance={500}
            />
            <OrbitTargetSync controlsRef={controlsRef} />
          </>
        )}
        {devSync}
      </>
    )
  }

  return (
    <>
      {!editorFlyMode && (
        <>
          <OrbitControls
            ref={controlsRef}
            enablePan
            enableDamping
            enableZoom={false}
            minDistance={0.5}
            maxDistance={500}
          />
          <OrbitTargetSync controlsRef={controlsRef} target={hutPosition} />
        </>
      )}
      {devSync}
    </>
  )
}
