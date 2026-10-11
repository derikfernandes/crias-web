import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/app.css'
import './styles/crias-tema.css'
import './styles/crias-ajustes.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/aluno">
      <App />
    </BrowserRouter>
  </StrictMode>,
)
