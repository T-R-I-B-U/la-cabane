export function IntroLoader({ fading, onClick, onKeyDown, onAnimationEnd }) {
  return (
    <div
      className={`intro-loader${fading ? ' intro-loader--fading' : ''}`}
      role="button"
      tabIndex={fading ? -1 : 0}
      aria-label="Commencer l'introduction"
      onClick={!fading ? onClick : undefined}
      onKeyDown={onKeyDown}
      onAnimationEnd={fading ? onAnimationEnd : undefined}
    >
      <p className="intro-loader-hint">Cliquer pour commencer</p>
    </div>
  )
}
