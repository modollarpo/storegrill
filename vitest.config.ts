import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    environmentMatchGlobs: [
      ['apps/web/**/*.test.tsx', 'jsdom'],
    ],
    include: [
      'packages/shared/src/**/*.test.ts',
      'apps/api/src/**/*.test.ts',
      'apps/web/src/**/*.test.tsx',
      'apps/web/src/**/*.test.ts',
    ],
    exclude: ['node_modules', 'dist', '.next'],
  },
  resolve: {
    alias: {
      '@storegrill/shared': path.resolve(__dirname, 'packages/shared/src'),
      '@': path.resolve(__dirname, 'apps/web/src'),
    },
  },
});
