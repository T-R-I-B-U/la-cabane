import { CharacterAnimationControls } from './CharacterAnimationControls'
import { DevSection } from './DevSection'

const MARIE_CLIPS = [
  'Armature|mixamo.com|Layer0',
  'marie-sitting-idle',
  'marie-standiing-idle',
  'marie-standingup',
]

const THOMAS_CLIPS = ['thomas-back', 'thomas-front', 'thomas-turn']

function PanelSection({ title, eyebrow, children }) {
  return (
    <section className="controls-section" aria-label={title}>
      <div className="controls-section-header">
        {eyebrow && <span className="controls-eyebrow">{eyebrow}</span>}
        <h2 className="controls-section-title">{title}</h2>
      </div>
      {children}
    </section>
  )
}

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
  const introLabel = !sceneReady
    ? 'Scène en chargement...'
    : introActive
      ? 'Intro en cours...'
      : introPending
        ? 'En attente...'
        : "Lancer l'histoire"

  return (
    <aside className="viewer-controls" aria-live="polite">
      <header className="controls-hero">
        <span className="controls-eyebrow">Expérience</span>
        <h1 className="controls-title">La Cabane</h1>
        {status === 'loading' && <p className="controls-status">Construction de la scène...</p>}
        {status === 'error' && <p className="controls-error">{info}</p>}
        {status === 'ok' && info && (
          <div className="controls-scene-summary" aria-label="Scene summary">
            <span>{info.meshes} meshes</span>
            <span>{info.pivots} pivots vides</span>
          </div>
        )}
      </header>

      <PanelSection title="Histoire" eyebrow="Flow">
        <button
          type="button"
          className="camera-toggle camera-toggle--primary"
          onClick={onLaunchIntro}
          disabled={!sceneReady || introPending || introActive}
        >
          <span className="camera-toggle-icon" aria-hidden="true">
            PLAY
          </span>
          {introLabel}
        </button>
      </PanelSection>

      <PanelSection title="Navigation" eyebrow="Camera">
        <button
          type="button"
          className={`camera-toggle${playerMode ? ' camera-toggle--active' : ''}`}
          aria-pressed={playerMode}
          onClick={onTogglePlayerMode}
        >
          <span className="camera-toggle-icon" aria-hidden="true">
            {playerMode ? 'FPS' : 'ORB'}
          </span>
          {playerMode ? 'Vue libre' : 'Vue joueur'}
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
          <button
            type="button"
            className={`camera-toggle${userMovementLocked ? '' : ' camera-toggle--active'}`}
            aria-pressed={!userMovementLocked}
            onClick={onToggleUserMovement}
          >
            {userMovementLocked ? 'Déplacement désactivé' : 'Déplacement actif'}
          </button>
        )}

        {playerMode && (
          <p className="controls-hint">Clic pour capturer · WASD pour avancer · ESC pour quitter</p>
        )}
      </PanelSection>

      {import.meta.env.DEV && (
        <PanelSection title="Devtools" eyebrow="Runtime">
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
                {debugDoors ? 'ON' : 'OFF'}
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
                {debugCollisions ? 'ON' : 'OFF'}
              </span>
              Debug collisions
            </button>
          </DevSection>
        </PanelSection>
      )}
    </aside>
  )
}
