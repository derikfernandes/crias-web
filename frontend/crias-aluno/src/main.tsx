import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { bindVisualViewport } from './lib/visualViewport'
// Crias Aluno v6. Os estilos antigos (app.css, crias-tema.css, crias-ajustes.css)
// continuam no repositório, sem alteração, mas deixaram de ser carregados.
import './styles/crias-v6.css'

bindVisualViewport()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/aluno">
      <App />
    </BrowserRouter>
  </StrictMode>,
)
