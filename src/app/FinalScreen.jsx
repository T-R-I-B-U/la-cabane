import './FinalScreen.css'

export function FinalScreen() {
  return (
    <div className="final-screen">
      <img className="final-screen__bg" src="/welcome/bg.jpg" alt="" aria-hidden="true" />
      <div className="final-screen__footer">
        <div className="final-screen__logo-group">
          <img className="final-screen__logo-main" src="/welcome/logo.png" alt="La Cabane" />
          <img
            className="final-screen__logo-subtitle"
            src="/welcome/subtitle.svg"
            width={266}
            height={37}
            alt="Altera 2050"
          />
        </div>
        <div className="final-screen__message">
          <p className="final-screen__tagline">À très vite&nbsp;!</p>
          <p className="final-screen__title">
            Rejoins ta cabane
            <br />
            et change le monde&nbsp;!
          </p>
        </div>
      </div>
    </div>
  )
}
