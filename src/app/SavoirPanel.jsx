import './SavoirPanel.css'
import { playOnce } from '../utils/audioStore'

export function SavoirPanel({ savoir, onClose, leafColRef, pendingLeaf }) {
  return (
    <div className="savoir-overlay" onPointerDown={(e) => e.stopPropagation()} onClick={() => { playOnce('closeUi'); onClose() }}>
      <div
        className="savoir-card"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="savoir-back" onClick={() => { playOnce('closeUi'); onClose() }} aria-label="Fermer">
          <img src="/arrow.svg" alt="" aria-hidden="true" />
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
                <p className="savoir-avail-label">Disponibilité</p>
                <div className="savoir-slots">
                  {savoir.slots.slice(0, 4).map((slot, i) => (
                    <div key={i} className="savoir-slot">
                      {slot}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
