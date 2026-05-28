import { useState, useEffect } from 'react'
import './SettingsMenu.css'
import { GearIcon } from './GearIcon'
import { playOnce } from '../utils/audioStore'

const QUALITY_OPTIONS = [
  { label: 'Faible', value: 'compressed2' },
  { label: 'Normal', value: 'compressed' },
  { label: 'Élevée', value: 'raw' },
]

function RadioPills({ options, value, onChange }) {
  return (
    <div className="settings-card__pills">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          className={`settings-pill${value === opt ? ' settings-pill--active' : ''}`}
          onClick={() => {
            playOnce('clickUi')
            onChange(opt)
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

export function SettingsMenu({
  open,
  onClose,
  volume,
  onVolumeChange,
  shadersEnabled,
  onShadersChange,
  shadowsEnabled,
  onShadowsChange,
  sensitivity,
  onSensitivityChange,
  modelQuality,
  onModelQualityChange,
  sceneLoaded,
}) {
  const ao = 'Non'
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement)

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  if (!open) return null

  const sensitivityPercent = Math.round((sensitivity - 0.5) * 100)
  const activeQualityLabel =
    QUALITY_OPTIONS.find((o) => o.value === modelQuality)?.label ?? 'Faible'

  return (
    <div className="settings-overlay" onPointerDown={(e) => e.stopPropagation()} onClick={onClose}>
      <div
        className="settings-card"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-card__header">
          <h2 className="settings-card__title">Réglages</h2>
          <GearIcon
            variant="textured"
            onClick={() => {
              playOnce('closeUi')
              onClose()
            }}
            ariaLabel="Fermer les réglages"
          />
        </div>

        <div
          className={`settings-card__section${sceneLoaded ? ' settings-card__section--disabled' : ''}`}
        >
          <p className="settings-card__label">Qualité des modèles</p>
          <RadioPills
            options={QUALITY_OPTIONS.map((o) => o.label)}
            value={activeQualityLabel}
            onChange={(label) => {
              const opt = QUALITY_OPTIONS.find((o) => o.label === label)
              if (opt) onModelQualityChange(opt.value)
            }}
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
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            aria-label="Volume principal"
          />
        </div>

        <div className="settings-card__section">
          <div className="settings-card__label-row">
            <p className="settings-card__label">Sensibilité</p>
            <p className="settings-card__value">{sensitivityPercent}%</p>
          </div>
          <input
            type="range"
            className="settings-range"
            min={50}
            max={150}
            step={5}
            value={Math.round(sensitivity * 100)}
            onChange={(e) => onSensitivityChange(Number(e.target.value) / 100)}
            aria-label="Sensibilité souris"
          />
        </div>

        <div className="settings-card__section settings-card__section--disabled">
          <p className="settings-card__label">Occlusion ambiante</p>
          <RadioPills options={['Oui', 'Non']} value={ao} onChange={() => {}} />
        </div>

        <div className="settings-card__section">
          <p className="settings-card__label">Shaders</p>
          <RadioPills options={['Oui', 'Non']} value={shadersEnabled} onChange={onShadersChange} />
        </div>

        <div className="settings-card__section">
          <p className="settings-card__label">Ombres</p>
          <RadioPills options={['Oui', 'Non']} value={shadowsEnabled} onChange={onShadowsChange} />
        </div>

        <button
          type="button"
          className="settings-fullscreen-btn"
          onClick={() => {
            playOnce('clickUi')
            toggleFullscreen()
          }}
        >
          {isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
        </button>
      </div>
    </div>
  )
}
