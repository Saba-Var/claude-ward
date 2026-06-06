import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // Gate the pure core, which the project requires to stay fully tested.
      // The I/O edges are covered too but not threshold-gated, since their
      // tests depend on filesystem permissions that vary by environment.
      include: ['src/core/**'],
      reporter: ['text', 'html'],
      thresholds: { lines: 90, functions: 90, branches: 80, statements: 90 },
    },
  },
})
