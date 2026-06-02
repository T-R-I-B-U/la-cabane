import { useRef, useState } from 'react'
import './MobileLandingVideo.css'

export function MobileLandingVideo() {
  const containerRef = useRef(null)
  const videoRef = useRef(null)
  const prefersSoundRef = useRef(false)
  const [needsUserPlay, setNeedsUserPlay] = useState(true)

  const playVideo = async ({ forceLoad = false, withSound = false } = {}) => {
    const video = videoRef.current
    if (!video) return

    const shouldPlayWithSound = withSound || prefersSoundRef.current

    video.muted = !shouldPlayWithSound
    video.defaultMuted = !shouldPlayWithSound
    video.playsInline = true
    video.setAttribute('playsinline', '')
    video.setAttribute('webkit-playsinline', '')

    if (forceLoad || video.readyState === 0) video.load()

    try {
      await video.play()
      setNeedsUserPlay(false)
    } catch {
      setNeedsUserPlay(true)
    }
  }

  const handleUserPlay = async (event) => {
    event.preventDefault()
    prefersSoundRef.current = true

    const container = containerRef.current
    if (container?.requestFullscreen) {
      try {
        await container.requestFullscreen()
      } catch {
        // Ignore fullscreen rejection and still try playback.
      }
    }

    playVideo({ forceLoad: true, withSound: true })
  }

  return (
    <main ref={containerRef} className="mobile-landing-video" aria-label="Teaser La Cabane">
      <video
        ref={videoRef}
        className="mobile-landing-video__media"
        playsInline
        loop
        preload="auto"
        onPlaying={() => setNeedsUserPlay(false)}
        onError={() => setNeedsUserPlay(true)}
      >
        <source src="/teaser.mp4" type="video/mp4" />
      </video>
      {needsUserPlay && (
        <button
          className="mobile-landing-video__play"
          type="button"
          onPointerDown={handleUserPlay}
          onClick={handleUserPlay}
          aria-label="Lire la video"
        >
          <span className="mobile-landing-video__play-icon" aria-hidden="true" />
        </button>
      )}
    </main>
  )
}
