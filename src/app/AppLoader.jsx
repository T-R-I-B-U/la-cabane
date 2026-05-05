export function AppLoader({ status, error }) {
  if (status === 'ok') return null

  const failed = status === 'error'

  return (
    <div className="app-loader" role="status" aria-live="polite" aria-label="Chargement de la scene">
      <div className="app-loader-panel">
        {failed ? (
          <>
            <span className="app-loader-eyebrow">La Cabane</span>
            <h1 className="app-loader-title">Le chargement a echoue</h1>
            <p className="app-loader-copy">
              {error || 'Une erreur inconnue a empeche le chargement de la scene.'}
            </p>
          </>
        ) : (
          <div className="app-loader-progress">
            <span className="app-loader-eyebrow">La Cabane</span>
            <div className="app-loader-progress-track app-loader-progress-track--pending">
              <div className="app-loader-progress-bar app-loader-progress-bar--pending" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
