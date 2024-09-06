// vitest.workspace.{ts,tsx}
import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      include: ['tests/unit/**/*.{test,spec}.{ts,tsx}', '**/*.n.{test,spec}.{ts,tsx}'],
      name: 'node',
      environment: 'node',
      globals: true,
    },
  },
  {
    test: {
      include: ['tests/browser/**/*.{test,spec}.{ts,tsx}', '**/*.b.{test,spec}.{ts,tsx}'],
      name: 'browser',
      browser: {
        provider: 'playwright', // or 'webdriverio'
        enabled: true,
        name: 'chromium', // browser name is required
        headless: true,
      },
      environment: 'browser',
      globals: true,
    },
  },
])
