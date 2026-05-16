export function StoryDebugPanel({
  onGoToIntroStart,
  onGoToBienvenue,
  onGoToAccueil,
  onGoToJournal,
  onGoToArbreApresJournal,
  onGoToEtabli,
  onGoToThomasEtabli,
  onGoToSerre,
  onGoToZoeSerre,
  onGoToMinijeu,
  onGoToJuiceMachine,
  onGoToSortieSerre,
  onGoToArbreBase,
  onGoToNestDialogue25,
}) {
  return (
    <aside className="story-debug-panel" aria-label="Story debug panel">
      <span className="story-debug-eyebrow">Debug story</span>
      <div className="story-debug-actions">
        <button type="button" className="camera-toggle" onClick={onGoToIntroStart}>
          Intro (début)
        </button>
        <button type="button" className="camera-toggle" onClick={onGoToBienvenue}>
          Bienvenue (arbre)
        </button>
        <button type="button" className="camera-toggle" onClick={onGoToAccueil}>
          Accueil
        </button>
        <button type="button" className="camera-toggle" onClick={onGoToJournal}>
          Journal (livre)
        </button>
        <button type="button" className="camera-toggle" onClick={onGoToArbreApresJournal}>
          Arbre (après journal)
        </button>
        <button type="button" className="camera-toggle" onClick={onGoToEtabli}>
          Établi
        </button>
        <button type="button" className="camera-toggle" onClick={onGoToThomasEtabli}>
          Thomas établi
        </button>
        <button type="button" className="camera-toggle" onClick={onGoToSerre}>
          Serre (entrée)
        </button>
        <button type="button" className="camera-toggle" onClick={onGoToZoeSerre}>
          Serre (Zoé)
        </button>
        <button type="button" className="camera-toggle" onClick={onGoToMinijeu}>
          Mini-jeu framboise
        </button>
        <button type="button" className="camera-toggle" onClick={onGoToJuiceMachine}>
          Machine à jus
        </button>
        <button type="button" className="camera-toggle" onClick={onGoToSortieSerre}>
          Sortie serre
        </button>
        <button type="button" className="camera-toggle" onClick={onGoToArbreBase}>
          Escalier arbre
        </button>
        <button type="button" className="camera-toggle" onClick={onGoToNestDialogue25}>
          Nid (dialogue 25)
        </button>
      </div>
    </aside>
  )
}
