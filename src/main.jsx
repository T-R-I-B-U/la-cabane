import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const CompressPage = import.meta.env.DEV ? lazy(() => import('./app/CompressPage.jsx')) : null
// eslint-disable-next-line react-refresh/only-export-components
const MobileView = lazy(() =>
  import('./app/MobileView.jsx').then((mod) => ({ default: mod.MobileView }))
)
// eslint-disable-next-line react-refresh/only-export-components
const MobileLandingVideo = lazy(() =>
  import('./app/MobileLandingVideo.jsx').then((mod) => ({ default: mod.MobileLandingVideo }))
)

const isMobileRoute = new URLSearchParams(window.location.search).get('mode') === 'mobile'
const isCompressRoute = window.location.pathname === '/compress'
const isMobileDevice = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches

let root
if (isMobileRoute) {
  root = (
    <StrictMode>
      <Suspense fallback={null}>
        <MobileView />
      </Suspense>
    </StrictMode>
  )
} else if (isCompressRoute && import.meta.env.DEV && CompressPage) {
  root = (
    <StrictMode>
      <Suspense fallback={<p style={{ padding: '2rem', fontFamily: 'monospace' }}>Loading…</p>}>
        <CompressPage />
      </Suspense>
    </StrictMode>
  )
} else if (isCompressRoute && import.meta.env.PROD) {
  root = <p style={{ padding: '2rem', fontFamily: 'monospace' }}>Dev-only page.</p>
} else if (isMobileDevice) {
  root = (
    <StrictMode>
      <Suspense fallback={null}>
        <MobileLandingVideo />
      </Suspense>
    </StrictMode>
  )
} else {
  root = (
    <StrictMode>
      <App />
    </StrictMode>
  )
}

createRoot(document.getElementById('root')).render(root)
