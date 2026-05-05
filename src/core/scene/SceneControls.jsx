import { OrbitControls } from '@react-three/drei'
import IntroCamera from '../../world/entities/IntroCamera'
import { CameraTracker } from '../IntroCameraDebug'
import { PlayerControls } from '../PlayerControls'

export function SceneControls({
  collisionObjects,
  introActive,
  arbreActive,
  introShouldAdvance,
  introSpawn,
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
  onCameraChange,
}) {
  if (arbreActive) return null

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
        flyMode={flyMode}
        spawnAt={introSpawn?.position}
        collisionObjects={collisionObjects}
        controlsRef={pointerControlsRef}
      />
    ) : null
  }

  return (
    <>
      <OrbitControls
        ref={controlsRef}
        target={hutPosition}
        enablePan={false}
        enableDamping
        minDistance={10}
        maxDistance={80}
        maxPolarAngle={Math.PI / 2.1}
      />
      {onCameraChange && <CameraTracker controlsRef={controlsRef} onChange={onCameraChange} />}
    </>
  )
}
