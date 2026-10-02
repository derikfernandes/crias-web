import { getSession } from '../lib/session'

export default function TrailsPage() {
  const session = getSession()!

  return (
    <div className="chat-home">
      <h1>Olá, {session.name.split(' ')[0] || 'aluno'}</h1>
      <p className="lede">
        Escolha uma trilha no menu à esquerda para abrir a conversa da trilha.
      </p>
      <p className="muted chat-home__hint">
        Cada mensagem segue a ordem definida pela sua instituição: conteúdo
        fixo, exercícios e etapas com tutoria.
      </p>
    </div>
  )
}
