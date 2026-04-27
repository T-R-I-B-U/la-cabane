import { DevSection } from './DevSection'

export function CharacterAnimationControls({ title, activeClip, clips, onSelect }) {
  return (
    <DevSection title={title}>
      {clips.map((clip) => (
        <button
          key={clip}
          type="button"
          className={`camera-toggle${activeClip === clip ? ' camera-toggle--active' : ''}`}
          aria-pressed={activeClip === clip}
          onClick={() => onSelect(clip)}
        >
          {clip}
        </button>
      ))}
    </DevSection>
  )
}
