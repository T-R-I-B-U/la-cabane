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
      onClick={(e) => e.stopPropagation()}
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
          <img src="/arrow.svg" alt="" aria-hidden="true" />
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
