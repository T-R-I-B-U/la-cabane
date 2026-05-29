import './GearIcon.css'

export function GearIcon({ onClick, ariaLabel = 'Paramètres' }) {
  return (
    <button type="button" className="gear-icon" onClick={onClick} aria-label={ariaLabel}>
      <img className="gear-icon__img" src="/menu/icon-inner.webp" alt="" aria-hidden="true" />
    </button>
  )
}
