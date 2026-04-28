import { useState } from 'react'

export function DevSection({ title, children }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`dev-section${open ? ' dev-section--open' : ''}`}>
      <button
        type="button"
        className="dev-section-header"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="dev-section-title">{title}</span>
        <span className="dev-section-arrow" aria-hidden="true">
          {open ? 'Masquer' : 'Afficher'}
        </span>
      </button>
      {open && <div className="dev-section-body">{children}</div>}
    </div>
  )
}
