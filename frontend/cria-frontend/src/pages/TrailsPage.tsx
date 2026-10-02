import { getSession } from '../lib/session'

export default function TrailsPage() {
  const session = getSession()!

  return (
    <div className="chat-home">
      <h1>Crias</h1>
      <p className="lede">
        Olá, {session.name.split(' ')[0] || 'aluno'}. Escolha uma trilha no menu
        à esquerda para abrir a conversa.
      </p>
      <p className="muted chat-home__hint">
        Cada mensagem segue a ordem da sua instituição: conteúdo fixo, exercícios
        e etapas com tutoria.
      </p>
    </div>
  )
}
