import { useOutletContext } from 'react-router-dom'
import { getSession } from '../lib/session'
import type { StudentTrailRow } from '../lib/api'

type LayoutOutlet = {
  trailRows: StudentTrailRow[] | null
  trailsError: string | null
  trailsLoading: boolean
  retryTrails: () => void
}

export default function TrailsPage() {
  const session = getSession()!
  const { trailRows, trailsError, trailsLoading, retryTrails } =
    useOutletContext<LayoutOutlet>()

  const empty =
    !trailsLoading && !trailsError && Array.isArray(trailRows) && trailRows.length === 0

  return (
    <div className="chat-home">
      <h1>Crias</h1>
      {trailsError ? (
        <>
          <p className="lede error" role="alert">
            {trailsError}
          </p>
          <button type="button" className="chat-home__retry" onClick={retryTrails}>
            Tentar de novo
          </button>
        </>
      ) : empty ? (
        <>
          <p className="lede">
            Olá, {session.name.split(' ')[0] || 'aluno'}. Nenhuma trilha vinculada
            à sua conta.
          </p>
          <p className="muted chat-home__hint">
            Fale com a escola para liberar uma trilha. O menu ao lado também
            mostra quando não há vínculos.
          </p>
        </>
      ) : (
        <>
          <p className="lede">
            Olá, {session.name.split(' ')[0] || 'aluno'}. Abra uma trilha no menu
            para continuar a aula.
          </p>
          <p className="muted chat-home__hint">
            {trailsLoading
              ? 'Carregando suas trilhas…'
              : 'Cada mensagem segue a ordem da sua instituição: conteúdo fixo, exercícios e etapas com tutoria.'}
          </p>
        </>
      )}
    </div>
  )
}
