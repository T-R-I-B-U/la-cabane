import { CharacterAnimationControls } from './CharacterAnimationControls'
import { DevSection } from './DevSection'

const MARIE_CLIPS = [
  'Armature|mixamo.com|Layer0',
  'marie-sitting-idle',
  'marie-standiing-idle',
  'marie-standingup',
]

const THOMAS_CLIPS = ['thomas-back', 'thomas-front', 'thomas-turn']

export function ViewerControls({
  status,
  info,
  sceneReady,
  introPending,
  introActive,
  playerMode,
  userMovementLocked,
  marieClip,
  thomasClip,
  debugDoors,
  debugCollisions,
  onLaunchIntro,
  onTogglePlayerMode,
  onGoToPlatform,
  onToggleUserMovement,
  onSelectMarieClip,
  onSelectThomasClip,
  onToggleDebugDoors,
  onToggleDebugCollisions,
}) {
  return (
    <aside className="viewer-controls" aria-live="polite">
      <h1 className="controls-title">La Cabane</h1>

      <div className="controls-divider" />

      {status === 'loading' && <p className="controls-status">Construction de la scène…</p>}
      {status === 'error' && <p className="controls-error">{info}</p>}
      {status === 'ok' && info && (
        <>
          <p className="controls-stat">
            <span className="dot dot--mesh" />
            {info.meshes} mesh{info.meshes !== 1 ? 'es' : ''}
          </p>
          <p className="controls-stat">
            <span className="dot dot--pivot" />
            {info.pivots} pivot{info.pivots !== 1 ? 's' : ''} manquants
          </p>
        </>
      )}

      <div className="controls-divider" />

      <button
        type="button"
        className="camera-toggle"
        onClick={onLaunchIntro}
        disabled={!sceneReady || introPending || introActive}
      >
        <span className="camera-toggle-icon" aria-hidden="true">
          ▶
        </span>
        {!sceneReady
          ? 'Scène en chargement…'
          : introActive
            ? 'Intro en cours…'
            : introPending
              ? 'En attente…'
              : "Lancer l'histoire"}
      </button>

      <div className="controls-divider" />

      <button
        type="button"
        className={`camera-toggle${playerMode ? ' camera-toggle--active' : ''}`}
        aria-pressed={playerMode}
        onClick={onTogglePlayerMode}
      >
        <span className="camera-toggle-icon" aria-hidden="true">
          {playerMode ? '🎮' : '🔭'}
        </span>
        {playerMode ? 'Mode joueur' : 'Mode orbite'}
      </button>

      <button
        type="button"
        className="camera-toggle"
        disabled={!sceneReady}
        onClick={onGoToPlatform}
      >
        Vue plateforme
      </button>

      {playerMode && (
        <>
          <button
            type="button"
            className={`camera-toggle${userMovementLocked ? '' : ' camera-toggle--active'}`}
            aria-pressed={!userMovementLocked}
            onClick={onToggleUserMovement}
          >
            {userMovementLocked ? 'Déplacement désactivé' : 'Déplacement actif'}
          </button>
          <p className="controls-hint">Clic pour capturer · WASD pour avancer · ESC pour quitter</p>
        </>
      )}

      {import.meta.env.DEV && (
        <>
          <div className="controls-divider" />
          <CharacterAnimationControls
            title="Marie"
            activeClip={marieClip}
            clips={MARIE_CLIPS}
            onSelect={onSelectMarieClip}
          />
          <CharacterAnimationControls
            title="Thomas"
            activeClip={thomasClip}
            clips={THOMAS_CLIPS}
            onSelect={onSelectThomasClip}
          />
          <DevSection title="Scène">
            <button
              type="button"
              className={`camera-toggle${debugDoors ? ' camera-toggle--active' : ''}`}
              aria-pressed={debugDoors}
              onClick={onToggleDebugDoors}
            >
              <span className="camera-toggle-icon" aria-hidden="true">
                {debugDoors ? '🟢' : '⚫'}
              </span>
              Debug portes
            </button>
            <button
              type="button"
              className={`camera-toggle${debugCollisions ? ' camera-toggle--active' : ''}`}
              aria-pressed={debugCollisions}
              onClick={onToggleDebugCollisions}
            >
              <span className="camera-toggle-icon" aria-hidden="true">
                {debugCollisions ? '🟢' : '⚫'}
              </span>
              Debug collisions
            </button>
          </DevSection>
        </>
      )}
    </aside>
  )
}
