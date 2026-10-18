import { defineConfig } from 'vitest/config'

// Eigene Konfiguration, damit das PWA-Plugin aus vite.config.ts in Tests nicht geladen wird
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'],
    exclude: ['src/**/*.e2e.test.ts', 'node_modules/**'],
    setupFiles: ['fake-indexeddb/auto']
  }
})
