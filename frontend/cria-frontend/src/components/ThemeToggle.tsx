import { useState } from 'react'

type Tema = 'escuro' | 'claro'
const CHAVE = 'crias-aluno-v2-tema'

function atual(): Tema {
  return document.documentElement.dataset.tema === 'claro' ? 'claro' : 'escuro'
}

export default function ThemeToggle() {
  const [tema, setTema] = useState<Tema>(atual)
  const escolher = (t: Tema) => {
    document.documentElement.dataset.tema = t
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', t === 'escuro' ? '#07110c' : '#ffffff')
    try {
      localStorage.setItem(CHAVE, t)
    } catch {
      /* sem armazenamento: vale só nesta visita */
    }
    setTema(t)
  }
  return (
    <div className="cr-tema" role="radiogroup" aria-label="Tema">
      <button type="button" role="radio" aria-checked={tema === 'claro'} onClick={() => escolher('claro')}>
        Claro
      </button>
      <button type="button" role="radio" aria-checked={tema === 'escuro'} onClick={() => escolher('escuro')}>
        Escuro
      </button>
    </div>
  )
}
