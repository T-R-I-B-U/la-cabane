import { useState } from 'react'

export function NameInput({ onSubmit }) {
  const [name, setName] = useState('')

  function submitName() {
    const trimmedName = name.trim()
    if (!trimmedName) return
    onSubmit(trimmedName)
  }

  return (
    <div className="name-input-overlay">
      <div className="name-input-card">
        <p className="name-input-label">Comment t'appelles-tu ?</p>
        <input
          className="name-input-field"
          type="text"
          aria-label="Ton prénom"
          placeholder="Ton prénom…"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && submitName()}
          autoFocus
        />
        <button type="button" className="name-input-submit camera-toggle" onClick={submitName}>
          Continuer
        </button>
      </div>
    </div>
  )
}
