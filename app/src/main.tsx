import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { injectSpeedInsights } from '@vercel/speed-insights'
import './index.css'
import App from './App.tsx'
import { PwaUpdateBanner } from './components/PwaUpdateBanner'
import { bindPwaUpdateSW, notifyNeedRefresh, notifyOfflineReady } from './lib/pwaUpdater'

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    notifyNeedRefresh()
  },
  onOfflineReady() {
    notifyOfflineReady()
  },
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return
    void registration.update()
    window.setInterval(() => {
      void registration.update()
    }, 60 * 60 * 1000)
  },
})
bindPwaUpdateSW(updateSW)

const LEGACY_CACHE_MIGRATION_KEY = 'pwa:legacyCacheMigration:v2026-02-25'
async function cleanupLegacyWorkboxCaches(): Promise<void> {
  if (typeof window === 'undefined' || typeof caches === 'undefined') return
  try {
    if (localStorage.getItem(LEGACY_CACHE_MIGRATION_KEY) === 'done') return
    const cacheNames = await caches.keys()
    const legacyNames = cacheNames.filter(
      (name) => name.startsWith('workbox-') || name.includes('precache'),
    )
    await Promise.all(legacyNames.map((name) => caches.delete(name)))
    localStorage.setItem(LEGACY_CACHE_MIGRATION_KEY, 'done')
  } catch {
    // ignore migration issues and continue startup
  }
}
void cleanupLegacyWorkboxCaches()

injectSpeedInsights()


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

const pwaBannerHostId = 'pwa-update-banner-root'
let pwaBannerHost = document.getElementById(pwaBannerHostId)
if (!pwaBannerHost) {
  pwaBannerHost = document.createElement('div')
  pwaBannerHost.id = pwaBannerHostId
  document.body.appendChild(pwaBannerHost)
}
createRoot(pwaBannerHost).render(
  <StrictMode>
    <PwaUpdateBanner />
  </StrictMode>,
)
