import './WelcomeScreen.css'

export function WelcomeScreen({ fading, onStart, onAnimationEnd }) {
  return (
    <div
      className={`welcome-screen${fading ? ' welcome-screen--fading' : ''}`}
      onAnimationEnd={fading ? onAnimationEnd : undefined}
    >
      <img className="welcome-screen__bg" src="/welcome/bg.webp" alt="" aria-hidden="true" />
      <div className="welcome-screen__footer">
        <div className="welcome-screen__logo-group">
          <img className="welcome-screen__logo-main" src="/welcome/logo.webp" alt="La Cabane" />
          <img
            className="welcome-screen__logo-subtitle"
            src="/welcome/subtitle.svg"
            width={266}
            height={37}
            alt="Altera 2050"
          />
        </div>
        <button
          className="welcome-screen__btn"
          type="button"
          onClick={!fading ? onStart : undefined}
        >
          <img
            className="welcome-screen__btn-bg"
            src="/welcome/button-bg.webp"
            alt=""
            aria-hidden="true"
          />
          <span>Commencer la visite</span>
        </button>
      </div>
    </div>
  )
}
