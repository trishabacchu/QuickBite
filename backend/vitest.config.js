import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup-env.js'],
    fileParallelism: false,
    hookTimeout: 60_000,
    testTimeout: 30_000,
    restoreMocks: true,
  },
});
