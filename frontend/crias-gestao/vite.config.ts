import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

function resolveAppVersion(): string {
  const fromEnv =
    process.env.VITE_APP_VERSION?.trim() ||
    process.env.VERCEL_GIT_COMMIT_REF?.trim()
  if (fromEnv) return fromEnv

  try {
    const branch = execSync('git branch --show-current', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    if (branch) return branch
  } catch {
    // ignore
  }

  try {
    const describe = execSync('git describe --tags --always', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    if (describe) return describe
  } catch {
    // ignore
  }

  return 'dev'
}

// Teste visual sem banco: VITE_MOCK_FIREBASE=1 troca o Firebase por um simulado em memória.
const mock = process.env.VITE_MOCK_FIREBASE === '1'
const mockDir = fileURLToPath(new URL('./dev/mock-firebase/', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: mock
    ? {
        alias: {
          'firebase/firestore': `${mockDir}firestore.ts`,
          'firebase/auth': `${mockDir}auth.ts`,
          'firebase/app': `${mockDir}app.ts`,
        },
      }
    : undefined,
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(resolveAppVersion()),
  },
  build: {
    rollupOptions: {
      output: {
        // Chunks estáveis para cache do browser — não altera comportamento.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
