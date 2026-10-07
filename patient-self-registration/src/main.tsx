import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './ui/ErrorBoundary'

window.addEventListener('error', (event) => console.error('[window]', event.error ?? event.message))
window.addEventListener('unhandledrejection', (event) => console.error('[promise]', event.reason))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Honours the OS "reduce motion" setting for every framer-motion animation. */}
    <MotionConfig reducedMotion="user">
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </MotionConfig>
  </StrictMode>,
)
