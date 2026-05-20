import { useEffect, useState } from 'react'
import { subscribeSubtitles } from '../../utils/audioStore'

const SPEAKERS = {
  marie: { label: 'MARIE', avatar: '/avatars/marie.svg' },
  thomas: { label: 'THOMAS', avatar: '/avatars/thomas.svg' },
  zoe: { label: 'ZOÉ', avatar: '/avatars/zoe.svg' },
  tree: { label: 'VOTRE GUIDE', avatar: '/avatars/tree.svg' },
}

const WRAP = {
  position: 'fixed',
  left: '50%',
  bottom: 48,
  transform: 'translateX(-50%)',
  zIndex: 900,
  width: 'min(80vw, 900px)',
  pointerEvents: 'none',
}

const BOX = (visible) => ({
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
  whiteSpace: 'nowrap',
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

export default function Subtitles() {
  const [state, setState] = useState({ text: '', speaker: null })

  useEffect(() => subscribeSubtitles(setState), [])

  const { text, speaker } = state
  const visible = Boolean(text)
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
        <p style={SUBTITLE_TEXT}>{text || ' '}</p>
      </div>
    </div>
  )
}
