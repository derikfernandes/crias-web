import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** Tip/audit: CRIAS_TIP_API=https://crias-web.vercel.app · local: localhost:3000 */
const tipApi = (process.env.CRIAS_TIP_API || 'http://localhost:3000').replace(
  /\/$/,
  '',
)

export default defineConfig({
  plugins: [react()],
  // Entrada única em crias.ai (raiz). /aluno redireciona para /.
  base: '/',
  server: {
    port: 5174,
    proxy: {
      '/student': { target: tipApi, changeOrigin: true },
      '/student_trails': { target: tipApi, changeOrigin: true },
      // Nomes / totais de etapa (chrome home + topbar — C3-N03 tip).
      '/trails': { target: tipApi, changeOrigin: true },
      '/trail_stages': { target: tipApi, changeOrigin: true },
      // Títulos e totais de atividades (menu e "AGORA" do Início).
      '/trail_stage_questions': { target: tipApi, changeOrigin: true },
      '/conversation_logs': { target: tipApi, changeOrigin: true },
      '/exercise_attempts': { target: tipApi, changeOrigin: true },
      '/unified_login': { target: tipApi, changeOrigin: true },
      '/api': { target: tipApi, changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
  },
})
