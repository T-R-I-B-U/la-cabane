import './LoadingScreen.css'

export function LoadingScreen({ status, error }) {
  if (status === 'ok') return null

  return (
    <div className="loading-screen">
      <img className="loading-screen__bg" src="/welcome/loading-bg.jpg" alt="" aria-hidden="true" />

      {status === 'error' ? (
        <p className="loading-screen__error" role="alert">
          {`Erreur de chargement : ${error ?? "la scène n'a pas pu être chargée."}`}
        </p>
      ) : (
        <div className="loading-screen__center">
          <div className="loading-screen__logo-group">
            <img className="loading-screen__logo-main" src="/welcome/logo.png" alt="La Cabane" />
            <img
              className="loading-screen__logo-subtitle"
              src="/welcome/subtitle.svg"
              width={266}
              height={37}
              alt="Altera 2050"
            />
          </div>
          <img
            className="loading-screen__sablier"
            src="/welcome/sablier.png"
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
