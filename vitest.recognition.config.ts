import { defineConfig } from 'vitest/config'

// Regressionstest der Dienstplan-Erkennung (dauert Minuten): npm run test:recognition
export default defineConfig({
  test: {
    include: ['src/**/*.e2e.test.ts'],
    testTimeout: 15 * 60 * 1000,
    hookTimeout: 5 * 60 * 1000,
    fileParallelism: false
  }
})
