import './MobileLandingVideo.css'

export function MobileLandingVideo() {
  return (
    <main className="mobile-landing-video" aria-label="Teaser La Cabane">
      <video
        className="mobile-landing-video__media"
        src="/teaser.mp4"
        autoPlay
        muted
        playsInline
        loop
      />
    </main>
  )
}
