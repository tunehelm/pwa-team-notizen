import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { injectSpeedInsights } from '@vercel/speed-insights'
import './index.css'
import App from './App.tsx'

registerSW()
injectSpeedInsights()

const nav = window.navigator as Navigator & { standalone?: boolean }
const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent)
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true

if (isIOS && isStandalone) {
  document.documentElement.classList.add('ios-standalone')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
