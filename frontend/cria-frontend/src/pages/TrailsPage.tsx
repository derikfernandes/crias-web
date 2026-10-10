import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { getSession } from '../lib/session'
import type { StudentTrailRow } from '../lib/api'
import { nextHomeGreeting } from '../lib/homeGreeting'
import { MARIA_AGENT_TRAIL_ID } from '../lib/mariaAgent'
import { sortTrailsByLastOpened } from '../lib/trailOpenState'
import { writeFocusedTrailId } from '../lib/trailFocus'

type LayoutOutlet = {
  trailRows: StudentTrailRow[] | null
  trailsError: string | null
  trailsLoading: boolean
  retryTrails: () => void
  trailNames?: Record<string, string>
  stageTotals?: Record<string, number>
}

function progressMeta(
  row: StudentTrailRow,
  totalRaw: number | null | undefined,
): { label: string; pct: number | null } {
  const total =
    totalRaw != null && totalRaw > 0
      ? Math.max(totalRaw, row.current_stage_number)
      : null
  const stage =
    row.status === 'completed' && total != null
      ? total
      : row.current_stage_number
  const label =
    total != null ? `Passo ${stage} de ${total}` : `Passo ${stage}`
  const pct =
    total != null
      ? row.status === 'completed'
        ? 100
        : Math.min(
            100,
            Math.max(0, Math.round(((Math.max(stage, 1) - 1) / total) * 100)),
          )
      : null
  return { label, pct }
}

export default function TrailsPage() {
  const session = getSession()!
  const navigate = useNavigate()
  const {
    trailRows,
    trailsError,
    trailsLoading,
    retryTrails,
    trailNames,
    stageTotals,
  } = useOutletContext<LayoutOutlet>()
  const [greeting] = useState(() =>
    nextHomeGreeting(session.student_id, session.name.split(' ')[0] || 'aluno'),
  )
  const [mariaDraft, setMariaDraft] = useState('')
  const firstCardRef = useRef<HTMLAnchorElement>(null)

  const empty =
    !trailsLoading && !trailsError && Array.isArray(trailRows) && trailRows.length === 0

  const ordered = useMemo(() => {
    if (!trailRows?.length) return []
    return sortTrailsByLastOpened(session.student_id, trailRows).filter(
      (r) => r.status !== 'blocked',
    )
  }, [trailRows, session.student_id])

  const visible = ordered.slice(0, 3)
  const hasMore = ordered.length > 3
  const homeLoading = trailsLoading && visible.length === 0 && !trailsError && !empty

  useEffect(() => {
    if (!visible.length || homeLoading) return
    const ae = document.activeElement
    if (ae && ae !== document.body && ae !== document.documentElement) return
    const id = window.requestAnimationFrame(() => {
      firstCardRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(id)
  }, [visible[0]?.trail_id, homeLoading])

  function onAskMaria(e: FormEvent) {
    e.preventDefault()
    const message = mariaDraft.trim()
    if (message) {
      try {
        sessionStorage.setItem(
          `crias:maria-draft:${MARIA_AGENT_TRAIL_ID}`,
          message,
        )
      } catch {
        /* ignore */
      }
    }
    navigate('/maria')
  }

  return (
    <div
      className={`chat-home horizonte chat-home--cards-${Math.min(visible.length || 1, 3)}`}
      aria-busy={homeLoading || undefined}
    >
      <span className="hz hz-brilho" aria-hidden />
      <span className="hz hz-linha" aria-hidden />
      <span className="hz hz-arco" aria-hidden />
      <img
        className="chat-home__symbol"
        src={`${import.meta.env.BASE_URL}crias-simbolo-luz.svg`}
        alt=""
        width={72}
        height={72}
      />
      <h1 className="chat-home__greeting titulo-leve">{greeting}</h1>
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
            Nenhuma trilha liberada para você.
          </p>
          <p className="muted chat-home__hint">
            Fale com a escola para liberar uma trilha. O menu também mostra quando
            a escola ainda não liberou.
          </p>
        </>
      ) : homeLoading ? (
        <div className="chat-home__loading" role="status" aria-live="polite">
          <div className="chat-home__cta-skeleton" aria-hidden="true" />
          <p className="muted chat-home__hint">Carregando suas trilhas…</p>
        </div>
      ) : (
        <>
          <div className="chat-home__cards">
            {visible.map((row, i) => {
              const label = trailNames?.[row.trail_id] || 'Trilha'
              const { label: passo, pct } = progressMeta(
                row,
                stageTotals?.[row.trail_id],
              )
              const href = `/trilha/${encodeURIComponent(row.trail_id)}`
              return (
                <Link
                  key={row.id}
                  ref={i === 0 ? firstCardRef : undefined}
                  to={href}
                  className="chat-home__card"
                  onClick={() => writeFocusedTrailId(row.trail_id)}
                >
                  <span className="chat-home__card-top">
                    <span className="chat-home__card-name">{label}</span>
                    <span className="chat-home__card-arrow" aria-hidden>
                      ›
                    </span>
                  </span>
                  {pct != null ? (
                    <span className="chat-home__card-progress" aria-hidden>
                      <span style={{ width: `${pct}%` }} />
                    </span>
                  ) : (
                    <span className="chat-home__card-progress" aria-hidden>
                      <span style={{ width: '0%' }} />
                    </span>
                  )}
                  <span className="chat-home__card-meta">{passo}</span>
                </Link>
              )
            })}
          </div>
          {hasMore ? (
            <p className="muted chat-home__hint">
              Outras trilhas no menu ao lado
            </p>
          ) : null}
        </>
      )}

      <form className="chat-home__maria" onSubmit={onAskMaria}>
        <input
          type="text"
          value={mariaDraft}
          onChange={(e) => setMariaDraft(e.target.value)}
          placeholder="Pergunte à Maria…"
          aria-label="Pergunte à Maria…"
        />
        <button
          type="submit"
          className="chat-home__maria-send"
          aria-label="Enviar pergunta à Maria"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M4.5 11.2 19.2 4.7a.8.8 0 0 1 1.1.9l-3.6 14.2a.8.8 0 0 1-1.3.4l-4.3-3.7-2.5 2.4a.6.6 0 0 1-1-.4v-3.9l11-8.2"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </form>
    </div>
  )
}
