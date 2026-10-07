import { Link, useOutletContext } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { getSession } from '../lib/session'
import type { StudentTrailRow } from '../lib/api'
import { pickHomeTrail } from '../lib/trailFocus'

type LayoutOutlet = {
  trailRows: StudentTrailRow[] | null
  trailsError: string | null
  trailsLoading: boolean
  retryTrails: () => void
  trailNames?: Record<string, string>
  stageTotals?: Record<string, number>
}

function homeCtaLabel(row: StudentTrailRow): string {
  if (row.status === 'not_started') return 'Começar trilha'
  if (row.status === 'completed') return 'Rever trilha'
  return 'Continuar trilha'
}

export default function TrailsPage() {
  const session = getSession()!
  const {
    trailRows,
    trailsError,
    trailsLoading,
    retryTrails,
    trailNames,
    stageTotals,
  } = useOutletContext<LayoutOutlet>()
  const ctaRef = useRef<HTMLAnchorElement>(null)

  const empty =
    !trailsLoading && !trailsError && Array.isArray(trailRows) && trailRows.length === 0
  const primary = pickHomeTrail(trailRows)
  const primaryLabel =
    primary && trailNames?.[primary.trail_id]
      ? trailNames[primary.trail_id]
      : primary
        ? 'Trilha'
        : null
  const primaryTotal =
    primary && stageTotals?.[primary.trail_id] && stageTotals[primary.trail_id] > 0
      ? stageTotals[primary.trail_id]
      : null
  const primaryEtapa =
    primary && primary.status === 'in_progress'
      ? primaryTotal != null
        ? `Etapa ${primary.current_stage_number} de ${Math.max(primaryTotal, primary.current_stage_number)}`
        : `Etapa ${primary.current_stage_number}`
      : null

  const homeLoading = trailsLoading && !primary && !trailsError && !empty

  // C2-R17 N03: pós-Minhas trilhas o layout zera restore → BODY; focar CTA útil.
  useEffect(() => {
    if (!primary || homeLoading) return
    const ae = document.activeElement
    if (ae && ae !== document.body && ae !== document.documentElement) return
    const id = window.requestAnimationFrame(() => {
      ctaRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(id)
  }, [primary?.trail_id, homeLoading])

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
            Olá, {session.name.split(' ')[0] || 'aluno'}. Nenhuma trilha liberada
            para você.
          </p>
          <p className="muted chat-home__hint">
            Fale com a escola para liberar uma trilha. O menu também mostra quando
            a escola ainda não liberou.
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
                ref={ctaRef}
                to={`/trilha/${encodeURIComponent(primary.trail_id)}`}
                className="chat-home__cta"
              >
                {homeCtaLabel(primary)}
              </Link>
              <p className="muted chat-home__hint">
                {primaryLabel}
                {primaryEtapa ? ` · ${primaryEtapa}` : ''}
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
