import './SettingsMenu.css'
import { GearIcon } from './GearIcon'

export function SettingsMenu({ open, onClose }) {
  if (!open) return null

  return (
    <div className="settings-overlay" onPointerDown={(e) => e.stopPropagation()} onClick={onClose}>
      <div
        className="settings-card"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-card__header">
          <h2 className="settings-card__title">Réglages</h2>
          <GearIcon variant="textured" onClick={onClose} ariaLabel="Fermer les réglages" />
        </div>

        <div className="settings-card__section">
          <p className="settings-card__label">Qualité graphique</p>
          <div className="settings-card__pills">
            <button type="button" className="settings-pill">
              Faible
            </button>
            <button type="button" className="settings-pill settings-pill--active">
              Normal
            </button>
            <button type="button" className="settings-pill">
              Élevée
            </button>
          </div>
        </div>

        <div className="settings-card__section">
          <div className="settings-card__label-row">
            <p className="settings-card__label">Son</p>
            <p className="settings-card__value">0%</p>
          </div>
          <div className="settings-card__slider">
            <div className="settings-card__knob">
              <img src="/welcome/sound-knob.png" alt="" aria-hidden="true" />
            </div>
          </div>
        </div>

        <div className="settings-card__section">
          <p className="settings-card__label">Occlusion ambiante</p>
          <div className="settings-card__pills">
            <button type="button" className="settings-pill">
              Oui
            </button>
            <button type="button" className="settings-pill settings-pill--active">
              Non
            </button>
          </div>
        </div>

        <div className="settings-card__section">
          <p className="settings-card__label">Shaders</p>
          <div className="settings-card__pills">
            <button type="button" className="settings-pill settings-pill--active">
              Oui
            </button>
            <button type="button" className="settings-pill">
              Non
            </button>
          </div>
        </div>

        <div className="settings-card__section">
          <p className="settings-card__label">Ombres</p>
          <div className="settings-card__pills">
            <button type="button" className="settings-pill">
              Oui
            </button>
            <button type="button" className="settings-pill settings-pill--active">
              Non
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
