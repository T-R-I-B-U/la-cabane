import { useState } from 'react'
import './SettingsMenu.css'
import { GearIcon } from './GearIcon'

function RadioPills({ options, value, onChange }) {
  return (
    <div className="settings-card__pills">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          className={`settings-pill${value === opt ? ' settings-pill--active' : ''}`}
          onClick={() => onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

export function SettingsMenu({ open, onClose }) {
  const [quality, setQuality] = useState('Normal')
  const [volume, setVolume] = useState(0)
  const [ao, setAo] = useState('Non')
  const [shaders, setShaders] = useState('Oui')
  const [ombres, setOmbres] = useState('Non')

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
          <RadioPills
            options={['Faible', 'Normal', 'Élevée']}
            value={quality}
            onChange={setQuality}
          />
        </div>

        <div className="settings-card__section">
          <div className="settings-card__label-row">
            <p className="settings-card__label">Son</p>
            <p className="settings-card__value">{volume}%</p>
          </div>
          <input
            type="range"
            className="settings-range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="Volume principal"
          />
        </div>

        <div className="settings-card__section">
          <p className="settings-card__label">Occlusion ambiante</p>
          <RadioPills options={['Oui', 'Non']} value={ao} onChange={setAo} />
        </div>

        <div className="settings-card__section">
          <p className="settings-card__label">Shaders</p>
          <RadioPills options={['Oui', 'Non']} value={shaders} onChange={setShaders} />
        </div>

        <div className="settings-card__section">
          <p className="settings-card__label">Ombres</p>
          <RadioPills options={['Oui', 'Non']} value={ombres} onChange={setOmbres} />
        </div>
      </div>
    </div>
  )
}
