import { useState, useEffect, useRef } from 'react'
import { cursorStore } from '../utils/cursorStore'

function useCustomHover(ref) {
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    return cursorStore.subscribePos((x, y) => {
      if (!ref.current) return
      const rect = ref.current.getBoundingClientRect()
      const isOver = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
      setHovered((prev) => {
        if (prev !== isOver) cursorStore.setType(isOver ? 'pointer' : 'default')
        return isOver
      })
    })
  }, [ref])

  return hovered
}

export function NameInput({ onSubmit }) {
  const [name, setName] = useState('')
  const btnRef = useRef(null)
  const inputRef = useRef(null)
  const btnHovered = useCustomHover(btnRef)
  useCustomHover(inputRef)

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
            ref={inputRef}
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
        <button
          ref={btnRef}
          type="button"
          className={`name-input-submit${btnHovered ? ' name-input-submit--hovered' : ''}`}
          onClick={submitName}
        >
          <span>Je valide !</span>
        </button>
      </div>
    </div>
  )
}
