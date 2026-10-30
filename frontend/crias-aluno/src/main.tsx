import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { bindVisualViewport } from './lib/visualViewport'
import { bindFullscreen } from './lib/fullscreen'
import { preloadMonitor } from './components/monitor/MonitorAvatar'
// Crias Aluno v1.0. Os estilos antigos (app.css, crias-tema.css, crias-ajustes.css)
// continuam no repositório, sem alteração, mas deixaram de ser carregados.
import './styles/crias-v1-0.css'

bindVisualViewport()
bindFullscreen()
// 1.3.4: personagem do monitor pronto antes do Início (sem símbolo no lugar enquanto carrega).
void preloadMonitor()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
