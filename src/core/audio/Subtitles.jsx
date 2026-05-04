import { useEffect, useState } from 'react'
import { subscribeSubtitles } from '../../utils'

const WRAP = {
  position: 'fixed',
  left: '50%',
  bottom: 48,
  transform: 'translateX(-50%)',
  zIndex: 900,
  maxWidth: 'min(80vw, 900px)',
  pointerEvents: 'none',
}

const BOX = (visible) => ({
  padding: '10px 18px',
  background: 'rgba(10,12,16,0.72)',
  color: '#fff',
  fontSize: 20,
  lineHeight: 1.35,
  textAlign: 'center',
  borderRadius: 6,
  backdropFilter: 'blur(6px)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
  opacity: visible ? 1 : 0,
  transform: `translateY(${visible ? 0 : 6}px)`,
  transition: 'opacity 180ms ease, transform 240ms ease',
  fontFamily: 'system-ui, sans-serif',
  letterSpacing: 0.2,
  textShadow: '0 1px 2px rgba(0,0,0,0.6)',
})

export default function Subtitles() {
  const [text, setText] = useState('')

  useEffect(() => subscribeSubtitles(setText), [])

  return (
    <div style={WRAP}>
      <div style={BOX(Boolean(text))}>{text || ' '}</div>
    </div>
  )
}
