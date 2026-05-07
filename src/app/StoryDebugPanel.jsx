export function StoryDebugPanel({
  onGoToIntroStart,
  onGoToDoorPassage,
  onGoToReception,
  onGoToTree,
  onGoToEtabli,
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
      </div>
    </aside>
  )
}
