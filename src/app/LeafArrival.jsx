import { useRef, useState, useEffect } from 'react'
import './LeafArrival.css'

// Dimensions naturelles de savoir-leaf.webp
const LEAF_W = 338
const LEAF_H = 629

export function LeafArrival({ drawingData, targetRef, onComplete }) {
  const [style, setStyle] = useState(null)
  const [imgSize, setImgSize] = useState({ width: 172, height: 320 })
  const doneRef = useRef(false)

  useEffect(() => {
    const targetEl = targetRef?.current
    const vw = window.innerWidth
    const vh = window.innerHeight

    let tx = 0
    let ty = 0
    let renderedW = 172
    let renderedH = 320

    if (targetEl) {
      const rect = targetEl.getBoundingClientRect()

      // Centre du col dans le viewport
      tx = rect.left + rect.width / 2 - vw / 2
      ty = rect.top + rect.height / 2 - vh / 2

      // Taille réelle de la feuille avec object-fit:contain dans le col
      const scaleByW = rect.width / LEAF_W
      const scaleByH = rect.height / LEAF_H
      const scale = Math.min(scaleByW, scaleByH)
      renderedW = LEAF_W * scale
      renderedH = LEAF_H * scale
    }

    setImgSize({ width: renderedW, height: renderedH })

    const start = {
      transform: `translate(${tx}px, ${-vh * 0.65}px) rotate(-8deg)`,
      opacity: 0,
      transition: 'none',
    }
    const end = {
      transform: `translate(${tx}px, ${ty}px) rotate(0deg)`,
      opacity: 1,
      transition: 'transform 1s cubic-bezier(0.25, 0.55, 0.45, 1), opacity 0.35s ease-in',
    }

    setStyle(start)

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
        <img
          src={drawingData ?? '/savoir-leaf.webp'}
          alt=""
          className="la-img"
          style={{ width: imgSize.width, height: imgSize.height }}
        />
      </div>
    </div>
  )
}
