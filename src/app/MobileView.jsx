import { useState, useRef, useEffect, useCallback } from 'react'
import { io } from 'socket.io-client'
import './MobileView.css'

const SOCKET_URL = `http://${window.location.hostname}:3001`

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const SLOTS = ['Matin', 'Aprem', 'Soir']

const DRAW_COLORS = [
  { id: 'olive', value: '#8a9042' },
  { id: 'slate', value: '#4a6878' },
  { id: 'orange', value: '#d4622a' },
  { id: 'cream', value: '#d4c87a' },
]

// ── Canvas leaf ──────────────────────────────────────────────────────
const CW = 300
const CH = 340
const CX = CW / 2
const LEAF_TOP = 4
const LEAF_BOT = CH - 4

function applyLeafPath(ctx) {
  ctx.beginPath()
  ctx.moveTo(CX, LEAF_TOP)
  ctx.bezierCurveTo(CX + 200, LEAF_TOP + 8, CX + 200, LEAF_BOT - 70, CX, LEAF_BOT)
  ctx.bezierCurveTo(CX - 200, LEAF_BOT - 70, CX - 200, LEAF_TOP + 8, CX, LEAF_TOP)
  ctx.closePath()
}

function drawLeafBackground(ctx) {
  ctx.clearRect(0, 0, CW, CH)

  ctx.save()
  applyLeafPath(ctx)
  ctx.fillStyle = '#e8f5e9'
  ctx.fill()
  ctx.restore()

  ctx.save()
  applyLeafPath(ctx)
  ctx.strokeStyle = '#3a7d44'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.restore()

  ctx.save()
  applyLeafPath(ctx)
  ctx.clip()
  ctx.strokeStyle = '#a5d6a7'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(CX, LEAF_BOT - 4)
  ctx.lineTo(CX, LEAF_TOP + 4)
  ctx.stroke()

  const veins = [
    { y: LEAF_TOP + 30, spread: 45, dy: 22 },
    { y: LEAF_TOP + 80, spread: 65, dy: 20 },
    { y: LEAF_TOP + 140, spread: 79, dy: 18 },
    { y: LEAF_TOP + 200, spread: 83, dy: 18 },
    { y: LEAF_TOP + 256, spread: 68, dy: 18 },
  ]
  ctx.strokeStyle = '#b2dfb8'
  ctx.lineWidth = 1
  for (const { y, spread, dy } of veins) {
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(CX, y)
      ctx.lineTo(CX + side * spread, y + dy)
      ctx.stroke()
    }
  }
  ctx.restore()
}

// ── Composant principal ──────────────────────────────────────────────
export function MobileView() {
  const [step, setStep] = useState(0)
  const [theme, setTheme] = useState(null)
  const [summary, setSummary] = useState('')
  const [location, setLocation] = useState(null)
  const [availability, setAvailability] = useState(new Set())
  const [drawColor, setDrawColor] = useState(DRAW_COLORS[0].value)
  const [flying, setFlying] = useState(false)

  const socketRef = useRef(null)
  const canvasRef = useRef(null)
  const drawingRef = useRef(false)
  const lastPosRef = useRef(null)

  useEffect(() => {
    const socket = io(SOCKET_URL)
    socketRef.current = socket
    return () => socket.disconnect()
  }, [])

  useEffect(() => {
    if (step === 5 && canvasRef.current) {
      drawLeafBackground(canvasRef.current.getContext('2d'))
    }
  }, [step])

  // ── Drawing handlers ─────────────────────────────────────────────
  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const sx = canvas.width / rect.width
    const sy = canvas.height / rect.height
    const src = e.touches ? e.touches[0] : e
    return {
      x: (src.clientX - rect.left) * sx,
      y: (src.clientY - rect.top) * sy,
    }
  }

  const startDraw = useCallback((e) => {
    e.preventDefault()
    drawingRef.current = true
    lastPosRef.current = getPos(e, canvasRef.current)
  }, [])

  const draw = useCallback(
    (e) => {
      e.preventDefault()
      if (!drawingRef.current) return
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      const pos = getPos(e, canvas)
      const last = lastPosRef.current
      ctx.save()
      applyLeafPath(ctx)
      ctx.clip()
      ctx.beginPath()
      ctx.moveTo(last.x, last.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.strokeStyle = drawColor
      ctx.lineWidth = 5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.stroke()
      ctx.restore()
      lastPosRef.current = pos
    },
    [drawColor]
  )

  const stopDraw = useCallback(() => {
    drawingRef.current = false
    lastPosRef.current = null
  }, [])

  const clearCanvas = () => {
    drawLeafBackground(canvasRef.current.getContext('2d'))
  }

  // ── Submit ───────────────────────────────────────────────────────
  const submit = () => {
    const drawingData = canvasRef.current?.toDataURL('image/png') ?? null
    socketRef.current?.emit('savoir-submit', {
      theme,
      summary,
      location,
      availability: [...availability],
      drawingData,
    })
    setFlying(true)
    setTimeout(() => {
      setFlying(false)
      setStep(6)
      setTimeout(() => setStep(7), 1500)
    }, 900)
  }

  const toggleSlot = (day, slot) => {
    const key = `${day}-${slot}`
    setAvailability((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // ── Screens ──────────────────────────────────────────────────────
  if (step === 0) {
    return (
      <div className="mv-s0-root">
        <img className="mv-s0-bg" src="/phone/bg-light.png" alt="" aria-hidden="true" />
        <div className="mv-s0-content">
          {/* Feuille : container portrait 218×408, image landscape 408×218 tournée -90° */}
          <div className="mv-s0-leaf-wrap">
            <div className="mv-s0-leaf-rotate">
              <div className="mv-s0-leaf-img-box">
                <img src="/phone/leaf.png" alt="" aria-hidden="true" />
              </div>
            </div>
          </div>
          {/* Bas : titre + bouton */}
          <div className="mv-s0-bottom">
            <p className="mv-s0-title">Créer mon savoir dans l'arbre</p>
            <button className="mv-s0-btn" onClick={() => setStep(1)}>
              <img className="mv-s0-btn-bg" src="/phone/btn-dark.png" alt="" aria-hidden="true" />
              <span>Je commence</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 1) {
    return (
      <div className="mv-s1-root">
        <img className="mv-s1-bg" src="/phone/bg-dark.png" alt="" aria-hidden="true" />
        <div className="mv-s1-content">
          <div className="mv-s1-top">
            <p className="mv-s1-title">Thème de mon savoir</p>
            <div className="mv-s1-cards">
              {['artisanat', 'connaissance', 'vivant'].map((t) => (
                <button
                  key={t}
                  className={`mv-s1-card ${theme === t ? 'mv-s1-card--selected' : ''}`}
                  onClick={() => setTheme(t)}
                >
                  <span>{t}</span>
                </button>
              ))}
            </div>
          </div>
          <button className="mv-s1-btn" onClick={() => setStep(2)} disabled={!theme}>
            <img className="mv-s1-btn-bg" src="/phone/btn-cream.png" alt="" aria-hidden="true" />
            <span>Suivant</span>
          </button>
        </div>
      </div>
    )
  }

  if (step === 2) {
    return (
      <div className="mv-s2-root">
        <img className="mv-s2-bg" src="/phone/bg-light.png" alt="" aria-hidden="true" />
        <div className="mv-s2-content">
          <div className="mv-s2-top">
            <p className="mv-s2-title">Résumé de mon savoir</p>
            <div className="mv-s2-card-wrap">
              <textarea
                className="mv-s2-textarea"
                placeholder="Décris ton savoir…"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </div>
          </div>
          <button className="mv-s2-btn" onClick={() => setStep(3)} disabled={!summary.trim()}>
            <img className="mv-s2-btn-bg" src="/phone/btn-dark.png" alt="" aria-hidden="true" />
            <span>Suivant</span>
          </button>
        </div>
      </div>
    )
  }

  if (step === 3) {
    return (
      <div className="mv-root mv-root--dark">
        <div className="mv-inner">
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 40, width: '100%', flex: 1 }}
          >
            <p className="mv-title mv-title--light">Lieu de l'apprentissage</p>
            <div className="mv-choices">
              {[
                { id: 'la-cabane', label: 'La Cabane' },
                { id: 'domicile', label: 'Domicile' },
                { id: 'exterieur', label: 'Extérieur' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  className={`mv-choice-btn ${location === id ? 'mv-choice-btn--selected' : ''}`}
                  onClick={() => setLocation(id)}
                >
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
          <button
            className="mv-btn-pill mv-btn-pill--cream"
            onClick={() => setStep(4)}
            disabled={!location}
          >
            Suivant
          </button>
        </div>
      </div>
    )
  }

  if (step === 4) {
    return (
      <div className="mv-root mv-root--light">
        <div className="mv-inner">
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 40, flex: 1, width: '100%' }}
          >
            <p className="mv-title mv-title--dark">Mes disponibilités</p>
            <div className="mv-avail-grid">
              {DAYS.map((day) => (
                <div key={day} className="mv-avail-row">
                  <div className="mv-avail-day">{day}</div>
                  {SLOTS.map((slot) => {
                    const key = `${day}-${slot}`
                    return (
                      <button
                        key={slot}
                        className={`mv-avail-slot ${availability.has(key) ? 'mv-avail-slot--selected' : ''}`}
                        onClick={() => toggleSlot(day, slot)}
                      >
                        {slot}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
          <button className="mv-btn-pill mv-btn-pill--dark" onClick={() => setStep(5)}>
            Suivant
          </button>
        </div>
      </div>
    )
  }

  if (step === 5) {
    return (
      <div className="mv-root mv-root--light">
        <div className="mv-inner">
          <p className="mv-title mv-title--dark">Personnalisation</p>
          <div className="mv-draw-wrap">
            <canvas
              ref={canvasRef}
              width={CW}
              height={CH}
              className={`mv-canvas ${flying ? 'mv-canvas--flying' : ''}`}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
            />
            <div className="mv-palette">
              {DRAW_COLORS.map((c) => (
                <button
                  key={c.id}
                  className={`mv-color-btn ${drawColor === c.value ? 'mv-color-btn--selected' : ''}`}
                  style={{
                    background: c.value,
                    boxShadow:
                      drawColor === c.value ? `0 0 0 3px white, 0 0 0 5px ${c.value}` : 'none',
                  }}
                  onClick={() => setDrawColor(c.value)}
                  aria-label={c.id}
                />
              ))}
            </div>
            <div className="mv-draw-actions">
              <button className="mv-btn-clear" onClick={clearCanvas}>
                Effacer
              </button>
              <button
                className="mv-btn-pill mv-btn-pill--dark"
                style={{ flex: 2 }}
                onClick={submit}
              >
                Je valide mon savoir
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 6) {
    return (
      <div className="mv-root mv-root--light">
        <div className="mv-inner" style={{ justifyContent: 'center', gap: 20 }}>
          <p className="mv-title mv-title--dark">J'envoi mon savoir</p>
          <div className="mv-arrow">↑</div>
        </div>
      </div>
    )
  }

  // step === 7 — Bravo
  return (
    <div className="mv-root mv-root--bravo">
      <div className="mv-bravo-bg" aria-hidden="true" />
      <div className="mv-bravo-text">
        <p className="mv-title mv-title--dark mv-title--xl">Bravo poursuis ta visite&nbsp;!</p>
      </div>
    </div>
  )
}
