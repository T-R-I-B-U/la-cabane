import { useEffect, useRef, useState } from 'react'
import { subscribeSubtitles } from '../../utils/audioStore'
import { cursorStore } from '../../utils/cursorStore'

const SPEAKERS = {
  marie: { label: 'MARIE', avatar: '/avatars/marie.webp' },
  thomas: { label: 'THOMAS', avatar: '/avatars/thomas.webp' },
  zoe: { label: 'ZOÉ', avatar: '/avatars/zoe.webp' },
  tree: { label: 'VOTRE GUIDE', avatar: '/avatars/guide.webp' },
}

const WRAP = {
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  justifyContent: 'center',
  padding: '60px 200px',
  zIndex: 900,
  pointerEvents: 'none',
}

const BOX = (visible) => ({
  width: '100%',
  maxWidth: 1112,
  display: 'flex',
  alignItems: 'center',
  gap: 40,
  padding: 10,
  background: 'rgba(255, 255, 255, 0.9)',
  borderRadius: 18,
  opacity: visible ? 1 : 0,
  transform: `translateY(${visible ? 0 : 6}px)`,
  transition: 'opacity 180ms ease, transform 240ms ease',
})

const SPEAKER_SECTION = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexShrink: 0,
}

const AVATAR = {
  width: 50,
  height: 50,
  borderRadius: '50%',
  objectFit: 'cover',
  flexShrink: 0,
}

const SPEAKER_NAME = {
  fontFamily: "'citrus-gothic-rough', serif",
  fontSize: 20,
  fontWeight: 400,
  color: '#33330f',
  lineHeight: 1,
  margin: 0,
  width: 92,
}

const SUBTITLE_TEXT = {
  fontFamily: "'Albert Sans', sans-serif",
  fontSize: 20,
  fontWeight: 500,
  color: '#33330f',
  lineHeight: 1,
  margin: 0,
  flex: 1,
  minWidth: 0,
}

const CHOICES = {
  display: 'flex',
  gap: 20,
  alignItems: 'center',
  flexShrink: 0,
  pointerEvents: 'auto',
}

function ChoiceButton({ label, onClick }) {
  const ref = useRef(null)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    return cursorStore.subscribePos((x, y) => {
      if (!ref.current) return
      const rect = ref.current.getBoundingClientRect()
      const isOver = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
      setHovered((prev) => {
        if (prev !== isOver) cursorStore.setType(isOver ? 'pointer' : 'default')
        return isOver
      })
    })
  }, [])

  return (
    <button
      ref={ref}
      type="button"
      className={`dialogue-choice-btn${hovered ? ' dialogue-choice-btn--hovered' : ''}`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

export default function Subtitles() {
  const [state, setState] = useState({ text: '', speaker: null, choices: null })

  useEffect(() => subscribeSubtitles(setState), [])

  const { text, speaker, choices } = state
  const hasChoices = choices && choices.length > 0
  const visible = Boolean(text) || hasChoices
  const speakerInfo = speaker ? SPEAKERS[speaker] : null

  return (
    <div style={WRAP}>
      <div style={BOX(visible)}>
        {speakerInfo && (
          <div style={SPEAKER_SECTION}>
            <img src={speakerInfo.avatar} alt={speakerInfo.label} style={AVATAR} />
            <p style={SPEAKER_NAME}>{speakerInfo.label}</p>
          </div>
        )}
        <p style={SUBTITLE_TEXT}>{text || ' '}</p>
        {hasChoices && (
          <div style={CHOICES}>
            {choices.map(({ label, onClick }) => (
              <ChoiceButton key={label} label={label} onClick={onClick} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
