import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const CompressPage = import.meta.env.DEV ? lazy(() => import('./app/CompressPage.jsx')) : null

const isCompressRoute = window.location.pathname === '/compress'

let root
if (isCompressRoute && import.meta.env.DEV && CompressPage) {
  root = (
    <StrictMode>
      <Suspense fallback={<p style={{ padding: '2rem', fontFamily: 'monospace' }}>Loading…</p>}>
        <CompressPage />
      </Suspense>
    </StrictMode>
  )
} else if (isCompressRoute && import.meta.env.PROD) {
  root = <p style={{ padding: '2rem', fontFamily: 'monospace' }}>Dev-only page.</p>
} else {
  root = (
    <StrictMode>
      <App />
    </StrictMode>
  )
}

createRoot(document.getElementById('root')).render(root)
