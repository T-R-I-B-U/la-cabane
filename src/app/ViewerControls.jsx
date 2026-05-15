import { DevSection } from './DevSection'
import {
  useVisibilityZones,
  toggleVisibilityZone,
  VISIBILITY_ZONES,
} from '../utils/visibilityZoneStore'

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

const MODEL_QUALITY_LEVELS = [
  { value: 'compressed2', label: 'Optimisé' },
  { value: 'compressed', label: 'Compressé' },
  { value: 'raw', label: 'Brut' },
]

export function ViewerControls({
  status,
  info,
  sceneReady,
  modelQuality,
  introPending,
  introActive,
  playerMode,
  flyMode,
  userMovementLocked,
  debugDoors,
  debugCollisions,
  interactionsEnabled,
  hdriOptions,
  noHdriId,
  activeHdriId,
  shaderEnabled,
  shaderRadius,
  leafMaterialMode,
  onHdriChange,
  onModelQualityChange,
  onLaunchIntro,
  onTogglePlayerMode,
  onToggleFlyMode,
  onToggleUserMovement,
  onToggleShader,
  onShaderRadiusChange,
  onToggleDebugDoors,
  onToggleDebugCollisions,
  onToggleInteractionsEnabled,
  onLeafMaterialChange,
}) {
  const visibilityZones = useVisibilityZones()

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
        <button
          type="button"
          className={`camera-toggle${shaderEnabled ? ' camera-toggle--active' : ''}`}
          aria-pressed={shaderEnabled}
          onClick={onToggleShader}
        >
          <span className="camera-toggle-icon" aria-hidden="true">
            {shaderEnabled ? 'ON' : 'OFF'}
          </span>
          Rendu aquarelle
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
          {playerMode ? 'Vue joueur active' : 'Activer vue joueur'}
        </button>

        {playerMode && (
          <button
            type="button"
            className={`camera-toggle${flyMode ? ' camera-toggle--active' : ''}`}
            aria-pressed={flyMode}
            onClick={onToggleFlyMode}
          >
            <span className="camera-toggle-icon" aria-hidden="true">
              {flyMode ? 'FLY' : 'WALK'}
            </span>
            {flyMode ? 'Mode fly actif' : 'Activer le mode fly'}
          </button>
        )}

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
          <p className="controls-hint">
            {flyMode
              ? 'Clic pour capturer · WASD pour bouger · Espace/Maj pour monter ou descendre'
              : 'Clic pour capturer · WASD pour avancer · ESC pour quitter'}
          </p>
        )}
      </PanelSection>

      {import.meta.env.DEV && (
        <PanelSection title="Devtools" eyebrow="Runtime">
          <DevSection title="Aquarelle">
            <label className="controls-slider-row">
              <span>Rayon</span>
              <input
                type="range"
                min="0"
                max="5"
                step="1"
                value={shaderRadius}
                onChange={(e) => onShaderRadiusChange(Number.parseInt(e.target.value, 10))}
              />
              <span className="controls-slider-value">{shaderRadius}</span>
            </label>
          </DevSection>
          <DevSection title="HDRI">
            <button
              type="button"
              className={`camera-toggle camera-toggle--compact${activeHdriId === noHdriId ? ' camera-toggle--active' : ''}`}
              aria-pressed={activeHdriId === noHdriId}
              onClick={() => onHdriChange(noHdriId)}
            >
              <span>Lumieres originales</span>
              <span className="camera-toggle-icon" aria-hidden="true">
                {activeHdriId === noHdriId ? 'ON' : 'OFF'}
              </span>
            </button>
            {hdriOptions.length > 0 ? (
              <div className="hdri-button-grid" role="list" aria-label="Choix de HDRI">
                {hdriOptions.map((option) => {
                  const active = option.id === activeHdriId

                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`camera-toggle camera-toggle--compact${active ? ' camera-toggle--active' : ''}`}
                      aria-pressed={active}
                      onClick={() => onHdriChange(option.id)}
                    >
                      <span>{option.label}</span>
                      <span className="camera-toggle-icon" aria-hidden="true">
                        {active ? 'ON' : 'HDR'}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="controls-hint">Ajoutez des fichiers .hdr ou .exr dans public/hdri.</p>
            )}
          </DevSection>
          <DevSection title="Matière">
            <button
              type="button"
              className={`camera-toggle${interactionsEnabled ? ' camera-toggle--active' : ''}`}
              aria-pressed={interactionsEnabled}
              onClick={onToggleInteractionsEnabled}
            >
              <span className="camera-toggle-icon" aria-hidden="true">
                {interactionsEnabled ? 'ON' : 'OFF'}
              </span>
              Interactions feuilles/fruits
            </button>

            {['standard', 'physical', 'emissive'].map((mode) => (
              <button
                key={mode}
                type="button"
                className={`camera-toggle${leafMaterialMode === mode ? ' camera-toggle--active' : ''}`}
                aria-pressed={leafMaterialMode === mode}
                onClick={() => onLeafMaterialChange(mode)}
              >
                <span className="camera-toggle-icon" aria-hidden="true">
                  {leafMaterialMode === mode ? 'ON' : 'OFF'}
                </span>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </DevSection>
          <DevSection title="Visibilité">
            {VISIBILITY_ZONES.map((zone) => {
              const active = visibilityZones.includes(zone)
              return (
                <button
                  key={zone}
                  type="button"
                  className={`camera-toggle${active ? ' camera-toggle--active' : ''}`}
                  aria-pressed={active}
                  onClick={() => toggleVisibilityZone(zone)}
                >
                  <span className="camera-toggle-icon" aria-hidden="true">
                    {active ? 'ON' : 'OFF'}
                  </span>
                  {zone}
                </button>
              )
            })}
          </DevSection>
          <DevSection title="Scène">
            {MODEL_QUALITY_LEVELS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={`camera-toggle${modelQuality === value ? ' camera-toggle--active' : ''}`}
                aria-pressed={modelQuality === value}
                onClick={() => onModelQualityChange(value)}
              >
                <span className="camera-toggle-icon" aria-hidden="true">
                  {modelQuality === value ? 'ON' : 'OFF'}
                </span>
                Modèles {label}
              </button>
            ))}
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
