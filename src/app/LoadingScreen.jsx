import { useEffect, useState } from 'react'
import './LoadingScreen.css'

const FRAME_COUNT = 23
const FRAME_DURATION_MS = 90
const ANIMATION_LOOP_MS = FRAME_COUNT * FRAME_DURATION_MS

function buildFrameUrls() {
  return Array.from({ length: FRAME_COUNT }, (_, index) => {
    const frameNumber = String(index + 1).padStart(2, '0')
    return `/welcome/loading-sequence/frame-${frameNumber}.webp`
  })
}

const FRAME_URLS = buildFrameUrls()

export function LoadingScreen({ status, error, fading, onAnimationEnd }) {
  const [frameIndex, setFrameIndex] = useState(0)
  const [framesReady, setFramesReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    Promise.all(
      FRAME_URLS.map((url) => {
        const image = new Image()
        image.src = url

        if (typeof image.decode === 'function') {
          return image.decode().catch(() => undefined)
        }

        return new Promise((resolve) => {
          image.addEventListener('load', resolve, { once: true })
          image.addEventListener('error', resolve, { once: true })
        })
      })
    ).finally(() => {
      if (!cancelled) setFramesReady(true)
    })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!framesReady) return

    let frameId = 0
    const startedAt = performance.now()

    const tick = (now) => {
      const elapsed = now - startedAt
      const nextFrameIndex = Math.floor((elapsed % ANIMATION_LOOP_MS) / FRAME_DURATION_MS)
      setFrameIndex((current) => (current === nextFrameIndex ? current : nextFrameIndex))
      frameId = window.requestAnimationFrame(tick)
    }

    frameId = window.requestAnimationFrame(tick)

    return () => window.cancelAnimationFrame(frameId)
  }, [framesReady])

  return (
    <div
      className={`loading-screen${fading ? ' loading-screen--fading' : ''}`}
      onAnimationEnd={fading ? onAnimationEnd : undefined}
    >
      <img
        className="loading-screen__bg"
        src="/welcome/loading-bg.webp"
        alt=""
        aria-hidden="true"
      />

      {status === 'error' ? (
        <p className="loading-screen__error" role="alert">
          {`Erreur de chargement : ${error ?? "la scène n'a pas pu être chargée."}`}
        </p>
      ) : (
        <div className="loading-screen__center">
          <div className="loading-screen__logo-group">
            <img
              className="loading-screen__logo-main"
              src="/welcome/loading-logo.webp"
              alt="La Cabane"
            />
            <img
              className="loading-screen__logo-subtitle"
              src="/welcome/loading-subtitle.svg"
              width={266}
              height={37}
              alt="Altera 2050"
            />
          </div>
          <img
            className="loading-screen__sequence"
            src={FRAME_URLS[framesReady ? frameIndex : 0]}
            width={160}
            height={160}
            alt=""
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  )
}
