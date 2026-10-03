import { Link, useOutletContext } from 'react-router-dom'
import { getSession } from '../lib/session'
import type { StudentTrailRow } from '../lib/api'

type LayoutOutlet = {
  trailRows: StudentTrailRow[] | null
  trailsError: string | null
  trailsLoading: boolean
  retryTrails: () => void
  trailNames?: Record<string, string>
}

function pickHomeTrail(
  rows: StudentTrailRow[] | null,
): StudentTrailRow | null {
  if (!rows || rows.length === 0) return null
  return (
    rows.find((r) => r.status === 'in_progress') ||
    rows.find((r) => r.status === 'not_started') ||
    rows.find((r) => r.status !== 'blocked') ||
    rows[0]
  )
}

function homeCtaLabel(row: StudentTrailRow): string {
  if (row.status === 'not_started') return 'Começar trilha'
  if (row.status === 'completed') return 'Rever trilha'
  return 'Continuar trilha'
}

export default function TrailsPage() {
  const session = getSession()!
  const { trailRows, trailsError, trailsLoading, retryTrails, trailNames } =
    useOutletContext<LayoutOutlet>()

  const empty =
    !trailsLoading && !trailsError && Array.isArray(trailRows) && trailRows.length === 0
  const primary = pickHomeTrail(trailRows)
  const primaryLabel =
    primary && trailNames?.[primary.trail_id]
      ? trailNames[primary.trail_id]
      : primary
        ? 'Trilha'
        : null

  const homeLoading = trailsLoading && !primary && !trailsError && !empty

  return (
    <div
      className="chat-home"
      aria-busy={homeLoading || undefined}
    >
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
            Fale com a escola para liberar uma trilha. O menu também mostra quando
            não há vínculos.
          </p>
        </>
      ) : (
        <>
          <p className="lede">
            Olá, {session.name.split(' ')[0] || 'aluno'}. Continue sua aula por
            aqui.
          </p>
          {homeLoading ? (
            <div
              className="chat-home__loading"
              role="status"
              aria-live="polite"
            >
              <div className="chat-home__cta-skeleton" aria-hidden="true" />
              <p className="muted chat-home__hint">Carregando suas trilhas…</p>
            </div>
          ) : primary ? (
            <>
              <Link
                to={`/trilha/${encodeURIComponent(primary.trail_id)}`}
                className="chat-home__cta"
              >
                {homeCtaLabel(primary)}
              </Link>
              <p className="muted chat-home__hint">
                {primaryLabel}
                {primary.status === 'in_progress'
                  ? ` · Etapa ${primary.current_stage_number}`
                  : ''}
                {trailRows && trailRows.length > 1
                  ? ' · outras trilhas no menu'
                  : ''}
              </p>
            </>
          ) : (
            <p className="muted chat-home__hint">
              Abra uma trilha no menu para continuar a aula.
            </p>
          )}
        </>
      )}
    </div>
  )
}
