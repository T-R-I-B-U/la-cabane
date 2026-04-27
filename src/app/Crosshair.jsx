export function Crosshair({ visible, active }) {
  if (!visible) return null

  return (
    <div className={`crosshair${active ? ' crosshair--active' : ''}`} aria-hidden="true">
      <div className="crosshair-ring" />
      <div className="crosshair-dot" />
    </div>
  )
}
