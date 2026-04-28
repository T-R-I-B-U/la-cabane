import { DevSection } from './DevSection'

export function CharacterAnimationControls({ title, activeClip, clips, onSelect }) {
  return (
    <DevSection title={title}>
      <div className="dev-clip-list">
        {clips.map((clip) => (
          <button
            key={clip}
            type="button"
            className={`camera-toggle camera-toggle--compact${activeClip === clip ? ' camera-toggle--active' : ''}`}
            aria-pressed={activeClip === clip}
            onClick={() => onSelect(clip)}
          >
            {clip}
          </button>
        ))}
      </div>
    </DevSection>
  )
}
