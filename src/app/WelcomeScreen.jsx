import './WelcomeScreen.css'
import { GearIcon } from './GearIcon'

const QUALITY_OPTIONS = [
  { label: 'Faible', value: 'compressed2' },
  { label: 'Normal', value: 'compressed' },
  { label: 'Élevée', value: 'raw' },
]

export function WelcomeScreen({
  fading,
  onStart,
  onAnimationEnd,
  onOpenSettings,
  settingsOpen,
  modelQuality,
  onModelQualityChange,
}) {
  return (
    <div
      className={`welcome-screen${fading ? ' welcome-screen--fading' : ''}`}
      onAnimationEnd={fading ? onAnimationEnd : undefined}
    >
      {!settingsOpen && (
        <div className="welcome-screen__top-right">
          <GearIcon variant="solid" onClick={onOpenSettings} ariaLabel="Ouvrir les réglages" />
        </div>
      )}

      <div className="welcome-screen__quality">
        {QUALITY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`welcome-screen__quality-pill${modelQuality === opt.value ? ' welcome-screen__quality-pill--active' : ''}`}
            onClick={() => onModelQualityChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <img className="welcome-screen__bg" src="/welcome/bg.webp" alt="" aria-hidden="true" />
      <div className="welcome-screen__footer">
        <div className="welcome-screen__logo-group">
          <img className="welcome-screen__logo-main" src="/welcome/logo.webp" alt="La Cabane" />
          <img
            className="welcome-screen__logo-subtitle"
            src="/welcome/subtitle.svg"
            width={266}
            height={37}
            alt="Altera 2050"
          />
        </div>
        <button
          className="welcome-screen__btn"
          type="button"
          onClick={!fading ? onStart : undefined}
        >
          <img
            className="welcome-screen__btn-bg"
            src="/welcome/button-bg.webp"
            alt=""
            aria-hidden="true"
          />
          <span>Commencer la visite</span>
        </button>
      </div>
    </div>
  )
}
