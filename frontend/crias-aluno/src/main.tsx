import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { bindVisualViewport } from './lib/visualViewport'
import { bindFullscreen } from './lib/fullscreen'
// Crias Aluno v1.0. Os estilos antigos (app.css, crias-tema.css, crias-ajustes.css)
// continuam no repositório, sem alteração, mas deixaram de ser carregados.
import './styles/crias-v1-0.css'

bindVisualViewport()
bindFullscreen()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/aluno">
      <App />
    </BrowserRouter>
  </StrictMode>,
)
