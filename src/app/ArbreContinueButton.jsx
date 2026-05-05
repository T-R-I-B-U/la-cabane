export function ArbreContinueButton({ label = 'Continuer', onClick }) {
  return (
    <div className="arbre-continue-button" role="button" tabIndex={0} onClick={onClick}>
      <p>{label}</p>
    </div>
  )
}
