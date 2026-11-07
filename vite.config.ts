import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Puerto del servidor API en desarrollo (npm run dev arranca ambos).
const API_PORT = process.env.API_PORT || '8787'
const apiProxy = { '/api': `http://localhost:${API_PORT}` }

// https://vite.dev/config/
export default defineConfig({
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '1.0.0'),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Muestra un aviso «Hay una versión nueva» en lugar de recargar sin preguntar.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Bocaditos BLW',
        short_name: 'Bocaditos',
        description: 'Seguimiento de la alimentación complementaria de tu bebé con el método BLW.',
        lang: 'es',
        dir: 'ltr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#fff8f1',
        theme_color: '#c6ebdb',
        categories: ['health', 'lifestyle', 'food'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Solo precacheamos los subconjuntos latinos de la fuente (español).
        globIgnores: ['**/*cyrillic*', '**/*vietnamese*'],
        navigateFallback: 'index.html',
        // La API nunca la sirve el service worker: siempre va al servidor.
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
