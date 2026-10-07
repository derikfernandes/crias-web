import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** Tip/audit: CRIAS_TIP_API=https://crias-web.vercel.app · local: localhost:3000 */
const tipApi = (process.env.CRIAS_TIP_API || 'http://localhost:3000').replace(
  /\/$/,
  '',
)

export default defineConfig({
  plugins: [react()],
  base: '/aluno/',
  server: {
    port: 5174,
    proxy: {
      '/student': { target: tipApi, changeOrigin: true },
      '/student_trails': { target: tipApi, changeOrigin: true },
      // Nomes / totais de etapa (chrome home + topbar — C3-N03 tip).
      '/trails': { target: tipApi, changeOrigin: true },
      '/trail_stages': { target: tipApi, changeOrigin: true },
      '/conversation_logs': { target: tipApi, changeOrigin: true },
      '/exercise_attempts': { target: tipApi, changeOrigin: true },
      '/api': { target: tipApi, changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
  },
})
