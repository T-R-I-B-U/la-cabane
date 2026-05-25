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
        <div className="name-input-content">
          <p className="name-input-title">
            Bienvenue à toi Nouveau membre : comment tu t&apos;appelles ?
          </p>
          <input
            className="name-input-field"
            type="text"
            aria-label="Ton prénom"
            placeholder="Mon prénom"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && submitName()}
            autoFocus
          />
        </div>
        <button type="button" className="name-input-submit" onClick={submitName}>
          Je valide !
        </button>
      </div>
    </div>
  )
}
