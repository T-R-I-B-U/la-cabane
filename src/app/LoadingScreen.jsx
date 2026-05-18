import './LoadingScreen.css'

export function LoadingScreen({ status, error }) {
  return (
    <div className="loading-screen">
      <img className="loading-screen__bg" src="/welcome/loading-bg.webp" alt="" aria-hidden="true" />

      {status === 'error' ? (
        <p className="loading-screen__error" role="alert">
          {`Erreur de chargement : ${error ?? "la scène n'a pas pu être chargée."}`}
        </p>
      ) : (
        <div className="loading-screen__center">
          <div className="loading-screen__logo-group">
            <img
              className="loading-screen__logo-main"
              src="/welcome/loading-logo.webp"
              alt="La Cabane"
            />
            <img
              className="loading-screen__logo-subtitle"
              src="/welcome/loading-subtitle.svg"
              width={266}
              height={37}
              alt="Altera 2050"
            />
          </div>
          <img
            className="loading-screen__sablier"
            src="/welcome/sablier.webp"
            width={148}
            height={185}
            alt=""
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  )
}
