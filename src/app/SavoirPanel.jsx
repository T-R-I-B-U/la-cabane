import './SavoirPanel.css'
import { playOnce } from '../utils/audioStore'

export function SavoirPanel({ savoir, onClose, leafColRef, pendingLeaf }) {
  return (
    <div
      className="savoir-overlay"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => {
        playOnce('closeUi')
        onClose()
      }}
    >
      <div
        className="savoir-card"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="savoir-back"
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
              stroke="#3b5866"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <line
              x1="42"
              y1="8"
              x2="8"
              y2="42"
              stroke="#3b5866"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="savoir-body">
          <div className="savoir-leaf-col" ref={leafColRef}>
            {!pendingLeaf && (
              <img
                className="savoir-leaf-img"
                src={savoir.drawingData ?? '/savoir-leaf.webp'}
                alt=""
                aria-hidden="true"
              />
            )}
          </div>

          <div className="savoir-content">
            <div className="savoir-info-col">
              <h2 className="savoir-title">{savoir.title}</h2>
              {savoir.person && <p className="savoir-person">{savoir.person}</p>}
              <p className="savoir-desc-label">Description</p>
              <p className="savoir-text">{savoir.text}</p>
            </div>

            {savoir.slots && savoir.slots.length > 0 && (
              <div className="savoir-avail-col">
                <div className="savoir-avail-top">
                  <p className="savoir-avail-label">Disponibilité</p>
                  <div className="savoir-slots">
                    {savoir.slots.slice(0, 4).map((slot, i) => (
                      <div key={i} className="savoir-slot">
                        {slot}
                      </div>
                    ))}
                  </div>
                </div>
                <button type="button" className="savoir-fav-btn">
                  Ajouter au favoris
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z"
                      stroke="#3b5866"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
