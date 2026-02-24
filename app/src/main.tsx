import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { injectSpeedInsights } from '@vercel/speed-insights'
import './index.css'
import App from './App.tsx'

registerSW({
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload()
    })
  },
})
injectSpeedInsights()


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
