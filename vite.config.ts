import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Base-Pfad für GitHub Pages Project Site (https://<user>.github.io/shifthappens/)
  base: '/shifthappens/',
  server: {
    host: true
  },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Texterkennung (mehrere MB) nicht vorab laden, sondern beim ersten Einsatz cachen
        globIgnores: ['**/tesseract/**'],
        runtimeCaching: [{
          urlPattern: ({ url }) => url.pathname.includes('/tesseract/'),
          handler: 'CacheFirst',
          options: { cacheName: 'tesseract-assets', expiration: { maxEntries: 10 } }
        }]
      },
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'ShiftHappens',
        short_name: 'ShiftHappens',
        description: 'Dein persönlicher Schichtplaner',
        theme_color: '#3880ff',
        icons: [
          {
            src: 'icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
})
