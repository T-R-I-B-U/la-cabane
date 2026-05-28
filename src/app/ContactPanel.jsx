import './ContactPanel.css'
import { playOnce } from '../utils/audioStore'

export function ContactPanel({ contact, onClose }) {
  const infoRows = [contact.role, contact.age, contact.neighborhood, contact.memberSince].filter(
    Boolean
  )

  return (
    <div
      className="cp-overlay"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => {
        playOnce('closeUi')
        onClose()
      }}
    >
      <div
        className="cp-card"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="cp-back"
          onClick={() => {
            playOnce('closeUi')
            onClose()
          }}
          aria-label="Fermer"
        >
          <svg width="50" height="50" viewBox="0 0 50 50" fill="none" aria-hidden="true">
            <line
              x1="8"
              y1="8"
              x2="42"
              y2="42"
              stroke="#33330f"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <line
              x1="42"
              y1="8"
              x2="8"
              y2="42"
              stroke="#33330f"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="cp-body">
          <div className="cp-left">
            <div className="cp-name-section">
              <h2 className="cp-name">{contact.name}</h2>
              <hr className="cp-sep" />
            </div>
            {contact.description && <p className="cp-desc">{contact.description}</p>}
          </div>

          <div className="cp-center">
            {contact.fruitImage && (
              <img src={contact.fruitImage} alt="" className="cp-fruit-img" aria-hidden="true" />
            )}
          </div>

          <div className="cp-right">
            {infoRows.map((info, i) => (
              <div key={i} className="cp-info-row">
                <span className="cp-info-line" />
                <p className="cp-info-label">{info}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
