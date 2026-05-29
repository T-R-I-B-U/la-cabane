import { useState, useRef, useEffect, useCallback } from 'react'
import { io } from 'socket.io-client'
import './MobileView.css'

const SOCKET_URL =
  import.meta.env.MODE === 'production'
    ? window.location.origin
    : `http://${window.location.hostname}:3001`

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const SLOTS = ['Matin', 'Aprem', 'Soir']

const DRAW_COLORS = [
  { id: 'olive', value: '#8a9042' },
  { id: 'slate', value: '#4a6878' },
  { id: 'orange', value: '#d4622a' },
  { id: 'cream', value: '#d4c87a' },
]

// ── Canvas leaf ──────────────────────────────────────────────────────
// Dimensions match savoir-leaf.webp (338×629) so the leaf fills the canvas
// exactly (scale=1) — no transparent padding in the exported PNG.
const CW = 338
const CH = 629

function drawLeafImg(ctx, img) {
  ctx.clearRect(0, 0, CW, CH)
  ctx.save()
  ctx.translate(CW / 2, CH / 2)
  // savoir-leaf.webp is portrait (338×629) — simple contain-fit, no rotation needed
  const scale = Math.min(CW / img.width, CH / img.height)
  ctx.drawImage(
    img,
    -(img.width * scale) / 2,
    -(img.height * scale) / 2,
    img.width * scale,
    img.height * scale
  )
  ctx.restore()
}

// ── Composant principal ──────────────────────────────────────────────
export function MobileView() {
  const [step, setStep] = useState(0)
  const [theme, setTheme] = useState(null)
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [location, setLocation] = useState(null)
  const [availability, setAvailability] = useState(new Set())
  const [drawColor, setDrawColor] = useState(DRAW_COLORS[0].value)
  const [flying, setFlying] = useState(false)
  const [drawingData, setDrawingData] = useState(null)

  const socketRef = useRef(null)
  const canvasRef = useRef(null)
  const drawingRef = useRef(false)
  const lastPosRef = useRef(null)
  const leafImgRef = useRef(null)
  const swipeStartYRef = useRef(null)
  const flyingRef = useRef(false)

  useEffect(() => {
    const socket = io(SOCKET_URL)
    socketRef.current = socket
    return () => socket.disconnect()
  }, [])

  useEffect(() => {
    if (step !== 6 || !canvasRef.current) return
    if (leafImgRef.current) {
      drawLeafImg(canvasRef.current.getContext('2d'), leafImgRef.current)
      return
    }
    const img = new Image()
    img.onload = () => {
      leafImgRef.current = img
      if (canvasRef.current) drawLeafImg(canvasRef.current.getContext('2d'), img)
    }
    img.src = '/savoir-leaf.webp'
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
      ctx.globalCompositeOperation = 'source-atop'
      ctx.beginPath()
      ctx.moveTo(last.x, last.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.strokeStyle = drawColor
      ctx.lineWidth = 5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.stroke()
      ctx.globalCompositeOperation = 'source-over'
      lastPosRef.current = pos
    },
    [drawColor]
  )

  const stopDraw = useCallback(() => {
    drawingRef.current = false
    lastPosRef.current = null
  }, [])

  // ── Submit ───────────────────────────────────────────────────────
  // Appelé depuis step 6 : collecte les données, émet, passe à l'écran d'envoi
  const submit = () => {
    const data = canvasRef.current?.toDataURL('image/png') ?? null
    socketRef.current?.emit('savoir-submit', {
      theme,
      title,
      summary,
      location,
      availability: [...availability],
      drawingData: data,
    })
    setDrawingData(data)
    setStep(7)
  }

  // Appelé depuis step 7 sur swipe up : anime la feuille puis passe à Bravo
  const sendLeaf = () => {
    if (flyingRef.current) return
    flyingRef.current = true
    setFlying(true)
    setTimeout(() => setStep(8), 900)
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
        <img className="mv-s0-bg" src="/phone/bg-light.webp" alt="" aria-hidden="true" />
        <div className="mv-s0-content">
          {/* Feuille : container portrait 218×408, image landscape 408×218 tournée -90° */}
          <div className="mv-s0-leaf-wrap">
            <div className="mv-s0-leaf-rotate">
              <div className="mv-s0-leaf-img-box">
                <img src="/phone/leaf.webp" alt="" aria-hidden="true" />
              </div>
            </div>
          </div>
          {/* Bas : titre + bouton */}
          <div className="mv-s0-bottom">
            <p className="mv-s0-title">Créer mon savoir dans l'arbre</p>
            <button className="mv-s0-btn" onClick={() => setStep(1)}>
              <img className="mv-s0-btn-bg" src="/phone/btn-dark.webp" alt="" aria-hidden="true" />
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
        <img className="mv-s1-bg" src="/phone/bg-dark.webp" alt="" aria-hidden="true" />
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
            <img className="mv-s1-btn-bg" src="/phone/btn-cream.webp" alt="" aria-hidden="true" />
            <span>Suivant</span>
          </button>
        </div>
      </div>
    )
  }

  if (step === 2) {
    return (
      <div className="mv-s2-root">
        <img className="mv-s2-bg" src="/phone/bg-light.webp" alt="" aria-hidden="true" />
        <div className="mv-s2-content">
          <div className="mv-s2-top">
            <p className="mv-s2-title">Titre de mon savoir</p>
            <div className="mv-s2-card-wrap">
              <textarea
                className="mv-s2-textarea mv-s2-textarea--title"
                placeholder="Donne un titre à ton savoir…"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          </div>
          <button className="mv-s2-btn" onClick={() => setStep(3)} disabled={!title.trim()}>
            <img className="mv-s2-btn-bg" src="/phone/btn-dark.webp" alt="" aria-hidden="true" />
            <span>Suivant</span>
          </button>
        </div>
      </div>
    )
  }

  if (step === 3) {
    return (
      <div className="mv-s2-root">
        <img className="mv-s2-bg" src="/phone/bg-light.webp" alt="" aria-hidden="true" />
        <div className="mv-s2-content">
          <div className="mv-s2-top">
            <p className="mv-s2-title">Résumé de mon savoir</p>
            <div className="mv-s2-card-wrap">
              <textarea
                className="mv-s2-textarea mv-s2-textarea--summary"
                placeholder="Décris ton savoir…"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={6}
              />
            </div>
          </div>
          <button className="mv-s2-btn" onClick={() => setStep(4)} disabled={!summary.trim()}>
            <img className="mv-s2-btn-bg" src="/phone/btn-dark.webp" alt="" aria-hidden="true" />
            <span>Suivant</span>
          </button>
        </div>
      </div>
    )
  }

  if (step === 4) {
    return (
      <div className="mv-s1-root">
        <img className="mv-s1-bg" src="/phone/bg-dark.webp" alt="" aria-hidden="true" />
        <div className="mv-s1-content">
          <div className="mv-s1-top">
            <p className="mv-s1-title">Lieu de l&apos;apprentissage</p>
            <div className="mv-s1-cards">
              {[
                { id: 'la-cabane', label: 'La Cabane' },
                { id: 'domicile', label: 'Domicile' },
                { id: 'exterieur', label: 'Extérieur' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  className={`mv-s1-card ${location === id ? 'mv-s1-card--selected' : ''}`}
                  onClick={() => setLocation(id)}
                >
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
          <button className="mv-s1-btn" onClick={() => setStep(5)} disabled={!location}>
            <img className="mv-s1-btn-bg" src="/phone/btn-cream.webp" alt="" aria-hidden="true" />
            <span>Suivant</span>
          </button>
        </div>
      </div>
    )
  }

  if (step === 5) {
    return (
      <div className="mv-s4-root">
        <img className="mv-s4-bg" src="/phone/bg-light.webp" alt="" aria-hidden="true" />
        <div className="mv-s4-content">
          <div className="mv-s4-top">
            <p className="mv-s4-title">Mes disponibilités</p>
            <div className="mv-s4-grid">
              {DAYS.map((day) => (
                <div key={day} className="mv-s4-row">
                  <div className="mv-s4-day">
                    <img
                      className="mv-s4-chip-bg"
                      src="/phone/chip-dark.webp"
                      alt=""
                      aria-hidden="true"
                    />
                    <span>{day}</span>
                  </div>
                  {SLOTS.map((slot) => {
                    const key = `${day}-${slot}`
                    const selected = availability.has(key)
                    return (
                      <button
                        key={slot}
                        className={`mv-s4-slot ${selected ? 'mv-s4-slot--selected' : ''}`}
                        onClick={() => toggleSlot(day, slot)}
                      >
                        <img
                          className="mv-s4-chip-bg"
                          src={selected ? '/phone/chip-selected.webp' : '/phone/chip-cream.webp'}
                          alt=""
                          aria-hidden="true"
                        />
                        <span>{slot}</span>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
          <button className="mv-s4-btn" onClick={() => setStep(6)}>
            <img className="mv-s4-btn-bg" src="/phone/btn-dark.webp" alt="" aria-hidden="true" />
            <span>Suivant</span>
          </button>
        </div>
      </div>
    )
  }

  if (step === 6) {
    return (
      <div className="mv-s5-root">
        <img className="mv-s5-bg" src="/phone/bg-light.webp" alt="" aria-hidden="true" />
        <div className="mv-s5-content">
          <div className="mv-s5-top">
            <p className="mv-s5-title">Personnalisation</p>
            <div className="mv-s5-draw-area">
              <canvas
                ref={canvasRef}
                width={CW}
                height={CH}
                className={`mv-s5-canvas ${flying ? 'mv-canvas--flying' : ''}`}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
              />
              <div className="mv-s5-palette">
                {DRAW_COLORS.map((c) => (
                  <button
                    key={c.id}
                    className={`mv-s5-color-btn ${drawColor === c.value ? 'mv-s5-color-btn--active' : ''}`}
                    style={{ background: c.value }}
                    onClick={() => setDrawColor(c.value)}
                    aria-label={c.id}
                  />
                ))}
              </div>
            </div>
            <p className="mv-s5-subtitle">Donne un aspect unique à ton savoir&nbsp;!</p>
          </div>
          <button className="mv-s5-btn" onClick={submit}>
            <img className="mv-s5-btn-bg" src="/phone/btn-dark.webp" alt="" aria-hidden="true" />
            <span>Je valide mon savoir</span>
          </button>
        </div>
      </div>
    )
  }

  if (step === 7) {
    return (
      <div
        className="mv-s6-root"
        onTouchStart={(e) => {
          swipeStartYRef.current = e.touches[0].clientY
        }}
        onTouchMove={(e) => {
          e.preventDefault()
          if (flyingRef.current) return
          const dy = e.touches[0].clientY - swipeStartYRef.current
          if (dy < -80) sendLeaf()
        }}
      >
        <img className="mv-s6-bg" src="/phone/bg-light.webp" alt="" aria-hidden="true" />
        <div className="mv-s6-content">
          <div className={`mv-s6-leaf-outer ${flying ? 'mv-s6-leaf--flying' : ''}`}>
            <img
              className="mv-s6-leaf-img"
              src={drawingData ?? '/savoir-leaf.webp'}
              alt=""
              aria-hidden="true"
            />
          </div>
          <div className="mv-s6-bottom">
            <p className="mv-s6-title">J&apos;envoi mon savoir</p>
            <div className="mv-s6-arrow-wrap">
              <img className="mv-s6-arrow" src="/phone/arrow-up.webp" alt="" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // step === 8 — Bravo
  return (
    <div className="mv-s7-root">
      <img className="mv-s7-bg" src="/phone/bravo-bg.webp" alt="" aria-hidden="true" />
      <div className="mv-s7-content">
        <p className="mv-s7-title">Bravo poursuis ta visite&nbsp;!</p>
      </div>
    </div>
  )
}
