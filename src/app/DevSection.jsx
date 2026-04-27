import { useState } from 'react'

export function DevSection({ title, children }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="dev-section">
      <button
        type="button"
        className="dev-section-header"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="dev-section-arrow" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
        {title}
      </button>
      {open && <div className="dev-section-body">{children}</div>}
    </div>
  )
}
