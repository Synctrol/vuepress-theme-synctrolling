import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [vue()],
        resolve: {
          alias: {
            'virtual:synctrol-backgrounds': fileURLToPath(
              new URL(
                './tests/fixtures/backgrounds/virtual-backgrounds-mock.ts',
                import.meta.url,
              ),
            ),
          },
        },
        test: {
          name: 'client',
          environment: 'happy-dom',
          include: ['tests/client/**/*.test.ts'],
          // Required so BackgroundHost CSS imports apply under getComputedStyle.
          css: true,
        },
      },
      {
        test: {
          name: 'node',
          environment: 'node',
          include: ['tests/**/*.test.ts'],
          exclude: [
            'tests/client/**',
            'tests/publish/postbuild/**',
            'tests/e2e/publish/**',
          ],
        },
      },
    ],
  },
})
