import { useRef, useState, useCallback } from 'react'
import './LeafArrival.css'

export function LeafArrival({ drawingData, targetRef, onComplete }) {
  const leafRef = useRef(null)
  const [flyStyle, setFlyStyle] = useState(null)

  const handleEnterEnd = useCallback(() => {
    if (flyStyle !== null) return // already in phase 2
    const leafEl = leafRef.current
    if (!leafEl) { onComplete?.(); return }

    const leafRect = leafEl.getBoundingClientRect()
    const targetRect = targetRef?.current?.getBoundingClientRect()

    const leafCx = leafRect.left + leafRect.width / 2
    const leafCy = leafRect.top + leafRect.height / 2

    let tx, ty, scale
    if (targetRect) {
      tx = targetRect.left + targetRect.width / 2 - leafCx
      ty = targetRect.top + targetRect.height / 2 - leafCy
      scale = targetRect.width / leafRect.width
    } else {
      // Fallback : monte hors écran
      tx = 0; ty = -window.innerHeight; scale = 0.4
    }

    setFlyStyle({
      transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
      opacity: 0,
      transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.6, 1), opacity 0.25s 0.35s ease-in',
    })

    setTimeout(() => onComplete?.(), 680)
  }, [flyStyle, targetRef, onComplete])

  return (
    <div className="la-overlay" aria-hidden="true">
      <div
        ref={leafRef}
        className={`la-leaf${flyStyle === null ? ' la-leaf--entering' : ''}`}
        style={flyStyle ?? undefined}
        onAnimationEnd={handleEnterEnd}
      >
        <img src={drawingData ?? '/savoir-leaf.webp'} alt="" className="la-img" />
      </div>
    </div>
  )
}
