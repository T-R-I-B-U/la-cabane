export function StoryDebugPanel({
  onGoToIntroStart,
  onGoToDoorPassage,
  onGoToReception,
  onGoToTree,
  onGoToEtabli,
  onGoToSerre,
  onGoToMinijeu,
  onGoToPostMinigame,
  onGoToArbreBase,
  onGoToNestDialogue25,
}) {
  return (
    <aside className="story-debug-panel" aria-label="Story debug panel">
      <span className="story-debug-eyebrow">Debug story</span>
      <div className="story-debug-actions">
        <button type="button" className="camera-toggle" onClick={onGoToIntroStart}>
          Intro (debut)
        </button>
        <button type="button" className="camera-toggle" onClick={onGoToDoorPassage}>
          Passage porte
        </button>
        <button type="button" className="camera-toggle" onClick={onGoToReception}>
          Accueil
        </button>
        <button type="button" className="camera-toggle" onClick={onGoToTree}>
          Arbre (dialogues)
        </button>
        <button type="button" className="camera-toggle" onClick={onGoToEtabli}>
          Établi
        </button>
        <button type="button" className="camera-toggle" onClick={onGoToSerre}>
          Serre (porte)
        </button>
        <button type="button" className="camera-toggle" onClick={onGoToMinijeu}>
          Mini-jeu framboise
        </button>
        <button type="button" className="camera-toggle" onClick={onGoToPostMinigame}>
          Fin mini-jeu (serre exit)
        </button>
        <button type="button" className="camera-toggle" onClick={onGoToArbreBase}>
          Arbre bas → escalier nid
        </button>
        <button type="button" className="camera-toggle" onClick={onGoToNestDialogue25}>
          Nid → dialogue 25
        </button>
      </div>
    </aside>
  )
}
