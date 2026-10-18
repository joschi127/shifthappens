import { defineConfig } from 'vitest/config'

// Eigene Konfiguration, damit das PWA-Plugin aus vite.config.ts in Tests nicht geladen wird
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    setupFiles: ['fake-indexeddb/auto']
  }
})
