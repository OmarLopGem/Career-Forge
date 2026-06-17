import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.js'],
    include: [
      'lib/**/*.test.{js,jsx,ts,tsx}',
      'app/**/*.test.{js,jsx,ts,tsx}',
    ],
    exclude: ['node_modules', '.next', 'out', 'build'],
    testTimeout: 60000,
    hookTimeout: 60000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
