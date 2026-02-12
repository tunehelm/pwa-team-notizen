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
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
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
        globPatterns: mode === 'development' ? [] : ['**/*.{js,css,html,ico,png,svg,webp,webmanifest}'],
        navigateFallback: '/index.html',
        // Terser-Workaround: Service Worker nicht minifizieren
        mode: 'development',
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
}))
