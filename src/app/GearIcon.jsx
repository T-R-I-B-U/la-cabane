import { useState } from 'react'
import './GearIcon.css'

export function GearIcon({ onClick, ariaLabel = 'Paramètres' }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      type="button"
      className="gear-icon"
      onClick={onClick}
      aria-label={ariaLabel}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        className="gear-icon__img"
        src={hovered ? '/menu/icon-hover.png' : '/menu/icon-default.png'}
        alt=""
        aria-hidden="true"
      />
    </button>
  )
}
