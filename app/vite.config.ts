import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    minify: 'esbuild', // esbuild statt terser – vermeidet PWA-Plugin-Konflikt
  },
  test: {
    environment: 'node',
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'SM-TeamNotes',
        short_name: 'SM-TeamNotes',
        description: 'Kollaborative Team-Notizen App',
        theme_color: '#0f172a',
        background_color: '#0f172a',
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
        // Include index.html in precache so NavigationRoute fallback is always resolvable.
        globPatterns: mode === 'development' ? [] : ['**/*.{html,js,css,ico,png,svg,webp,webmanifest}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/auth/, /supabase/],
        navigateFallbackAllowlist: [/^\/$/, /^\/folder\//, /^\/note\//, /^\/team/, /^\/trash/, /^\/search/, /^\/private/, /^\/sales/, /^\/admin/],
        cleanupOutdatedCaches: true,
        // Safer update flow: activate new SW only after explicit user action.
        skipWaiting: false,
        clientsClaim: false,
        runtimeCaching: [
          // Supabase: alle HTTP-Methoden direkt ans Netz (nie cachen)
          // Separate Einträge pro Methode – Workbox matcht nur GET wenn kein method angegeben
          { urlPattern: /supabase\.co/, handler: 'NetworkOnly', method: 'GET' },
          { urlPattern: /supabase\.co/, handler: 'NetworkOnly', method: 'POST' },
          { urlPattern: /supabase\.co/, handler: 'NetworkOnly', method: 'PUT' },
          { urlPattern: /supabase\.co/, handler: 'NetworkOnly', method: 'PATCH' },
          { urlPattern: /supabase\.co/, handler: 'NetworkOnly', method: 'DELETE' },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
}))
