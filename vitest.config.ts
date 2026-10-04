import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        test: {
          name: 'server',
          include: ['server/lib/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'aluno',
          include: ['frontend/cria-frontend/src/lib/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        plugins: [react()],
        test: {
          name: 'frontend',
          include: [
            'frontend/trilha-admin/src/**/*.test.ts',
            'frontend/trilha-admin/src/**/*.test.tsx',
          ],
          environment: 'jsdom',
          setupFiles: ['./frontend/trilha-admin/src/test/setup.ts'],
        },
      },
    ],
  },
})
