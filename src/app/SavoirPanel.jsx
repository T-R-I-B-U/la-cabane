import { useEffect } from 'react'

export function SavoirPanel({ savoir, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      // Capture phase + stopImmediatePropagation so useIntroFlow's Escape listener doesn't fire.
      e.stopImmediatePropagation()
      onClose()
    }
    // capture: true so this fires before bubble-phase listeners (including useIntroFlow's exitIntro)
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [onClose])

  return (
    <div className="savoir-overlay">
      <div className="savoir-card">
        <button type="button" className="savoir-close" onClick={onClose} aria-label="Fermer">
          ✕
        </button>
        <p className="savoir-category">{savoir.category}</p>
        <h2 className="savoir-title">{savoir.title}</h2>
        <p className="savoir-text">{savoir.text}</p>
        {savoir.contact && (
          <p className="savoir-contact">
            <span className="savoir-contact-label">Contact : </span>
            {savoir.contact}
          </p>
        )}
      </div>
    </div>
  )
}
