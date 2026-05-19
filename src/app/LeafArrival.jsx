import { useRef, useState, useEffect } from 'react'
import './LeafArrival.css'

export function LeafArrival({ drawingData, targetRef, onComplete }) {
  const [style, setStyle] = useState(null)
  const doneRef = useRef(false)

  useEffect(() => {
    const targetEl = targetRef?.current
    const vw = window.innerWidth
    const vh = window.innerHeight

    // Horizontal offset : center of target relative to viewport center
    let tx = 0
    let ty = 0
    if (targetEl) {
      const rect = targetEl.getBoundingClientRect()
      tx = rect.left + rect.width / 2 - vw / 2
      ty = rect.top + rect.height / 2 - vh / 2
    }

    // Start : même X que la cible, hors écran en haut
    const start = {
      transform: `translate(${tx}px, ${-vh * 0.65}px) rotate(-8deg)`,
      opacity: 0,
      transition: 'none',
    }
    // End : centre de la colonne feuille, à la verticale correcte
    const end = {
      transform: `translate(${tx}px, ${ty}px) rotate(0deg)`,
      opacity: 1,
      transition: 'transform 1s cubic-bezier(0.25, 0.55, 0.45, 1), opacity 0.35s ease-in',
    }

    setStyle(start)

    // Double rAF pour forcer le browser à appliquer le start avant la transition
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setStyle(end)
        setTimeout(() => {
          if (!doneRef.current) {
            doneRef.current = true
            onComplete?.()
          }
        }, 1100)
      })
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!style) return null

  return (
    <div className="la-overlay" aria-hidden="true">
      <div className="la-leaf" style={style}>
        <img src={drawingData ?? '/savoir-leaf.webp'} alt="" className="la-img" />
      </div>
    </div>
  )
}
