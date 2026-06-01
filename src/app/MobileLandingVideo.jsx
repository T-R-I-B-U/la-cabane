import { useEffect, useRef, useState } from 'react'
import './MobileLandingVideo.css'

export function MobileLandingVideo() {
  const videoRef = useRef(null)
  const [needsUserPlay, setNeedsUserPlay] = useState(false)

  const playVideo = async () => {
    const video = videoRef.current
    if (!video) return

    video.muted = true
    video.playsInline = true

    try {
      await video.play()
      setNeedsUserPlay(false)
    } catch {
      setNeedsUserPlay(true)
    }
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
        src="/teaser.mp4"
        autoPlay
        muted
        playsInline
        loop
        preload="auto"
      />
      {needsUserPlay && (
        <button className="mobile-landing-video__play" type="button" onClick={playVideo}>
          Lancer la vidéo
        </button>
      )}
    </main>
  )
}
