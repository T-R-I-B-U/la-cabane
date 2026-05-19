import './LeafArrival.css'

export function LeafArrival({ drawingData, onComplete }) {
  return (
    <div className="la-overlay" aria-hidden="true">
      <div className="la-leaf" onAnimationEnd={onComplete}>
        <img src={drawingData ?? '/savoir-leaf.webp'} alt="" className="la-img" />
      </div>
    </div>
  )
}
