import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    port: 5173,
    strictPort: true, // Wenn 5173 belegt ist: Fehler statt anderem Port – nur eine URL in Supabase nötig
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      minify: false,
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'PWA Team-Notizen',
        short_name: 'TeamNotizen',
        description: 'Kollaborative Team-Notizen PWA',
        theme_color: '#3b82f6',
        background_color: '#f0f4f8',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache nur im Produktions-Build (in dev hat dev-dist fast keine Dateien → Warnung).
        globPatterns: mode === 'development' ? [] : ['**/*.{js,css,html,ico,png,svg,webp,webmanifest}'],
        // SPA-Routen offline immer auf die gecachte index.html abbilden.
        navigateFallback: '/index.html',
        // offline.html nur nutzen, wenn keine index.html aus dem Cache verfügbar ist.
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages',
              networkTimeoutSeconds: 3,
              cacheableResponse: {
                statuses: [0, 200],
              },
              precacheFallback: {
                fallbackURL: '/offline.html',
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
}))
