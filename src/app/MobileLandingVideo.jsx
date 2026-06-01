import { useEffect, useRef, useState } from 'react'
import './MobileLandingVideo.css'

export function MobileLandingVideo() {
  const videoRef = useRef(null)
  const [needsUserPlay, setNeedsUserPlay] = useState(false)

  const playVideo = async ({ forceLoad = false } = {}) => {
    const video = videoRef.current
    if (!video) return

    video.muted = true
    video.defaultMuted = true
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

  const handleUserPlay = (event) => {
    event.preventDefault()
    playVideo({ forceLoad: true })
  }

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      playVideo()
    })

    return () => cancelAnimationFrame(frameId)
  }, [])

  return (
    <main className="mobile-landing-video" aria-label="Teaser La Cabane">
      <video
        ref={videoRef}
        className="mobile-landing-video__media"
        autoPlay
        muted
        defaultMuted
        playsInline
        loop
        preload="auto"
        onPlaying={() => setNeedsUserPlay(false)}
        onCanPlay={() => playVideo()}
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
        >
          <img
            className="mobile-landing-video__play-bg"
            src="/phone/btn-dark.webp"
            alt=""
            aria-hidden="true"
          />
          <span>Lancer la vidéo</span>
        </button>
      )}
    </main>
  )
}
