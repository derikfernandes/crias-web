import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { getSession } from '../lib/session'
import type { StudentTrailRow } from '../lib/api'
import { nextHomeGreeting } from '../lib/homeGreeting'
import { MARIA_AGENT_TRAIL_ID } from '../lib/mariaAgent'
import { sortTrailsByLastOpened } from '../lib/trailOpenState'
import { writeFocusedTrailId } from '../lib/trailFocus'
import {
  activityProgressPct,
  formatAtividadeLabel,
  formatPassoLabel,
} from '../lib/trailProgressLabel'
import MariaFace from '../components/MariaFace'
import TrailOrb, { TrailChevron } from '../components/TrailOrb'
import SendArrowIcon from '../components/SendArrowIcon'

type LayoutOutlet = {
  trailRows: StudentTrailRow[] | null
  trailsError: string | null
  trailsLoading: boolean
  retryTrails: () => void
  trailNames?: Record<string, string>
  stageTotals?: Record<string, number>
  questionTotals?: Record<string, number>
}

function progressMeta(
  row: StudentTrailRow,
  totalActivities: number | null | undefined,
  totalSteps: number | null | undefined,
): { label: string; pct: number | null; cta: string } {
  const completed = row.status === 'completed'
  const activity =
    completed && totalActivities != null && totalActivities > 0
      ? Math.max(totalActivities, row.current_question_number)
      : row.current_question_number
  const label =
    formatAtividadeLabel(activity, totalActivities) ||
    formatPassoLabel(
      completed && totalSteps != null && totalSteps > 0
        ? Math.max(totalSteps, row.current_stage_number)
        : row.current_stage_number,
      totalSteps,
    ) ||
    `Atividade ${Math.max(activity, 1)}`
  const pct =
    activityProgressPct({
      activity,
      totalActivities,
      completed,
    }) ??
    (totalSteps != null && totalSteps > 0
      ? completed
        ? 100
        : Math.min(
            100,
            Math.max(
              0,
              Math.round(
                ((Math.max(row.current_stage_number, 1) - 1) /
                  Math.max(totalSteps, row.current_stage_number)) *
                  100,
              ),
            ),
          )
      : null)
  const cta =
    row.status === 'not_started'
      ? 'Começar'
      : row.status === 'completed'
        ? 'Rever'
        : 'Continuar'
  return { label, pct, cta }
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
    questionTotals,
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
  const firstName = session.name.split(' ')[0] || 'aluno'

  useEffect(() => {
    if (!visible.length || homeLoading) return
    const ae = document.activeElement
    if (ae && ae !== document.body && ae !== document.documentElement) return
    const id = window.requestAnimationFrame(() => {
      /* preventScroll: foco no card não pode empurrar a Maria para fora. */
      firstCardRef.current?.focus({ preventScroll: true })
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
      className={`chat-home chat-home--v4 chat-home--cards-${Math.min(visible.length || 1, 3)}`}
      aria-busy={homeLoading || undefined}
    >
      <div className="chat-home__body">
        <div className="chat-home__hero">
          <MariaFace size="hero" mood="oi" />
          <p className="chat-home__bubble" aria-hidden>
            Oi, {firstName}!
          </p>
        </div>
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
            <p className="lede">Nenhuma trilha liberada para você.</p>
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
                const label =
                  trailNames?.[row.trail_id] || row.trail_id || 'Trilha'
                const { label: progresso, pct, cta } = progressMeta(
                  row,
                  questionTotals?.[row.trail_id],
                  stageTotals?.[row.trail_id],
                )
                const href = `/trilha/${encodeURIComponent(row.trail_id)}`
                const meta =
                  pct != null ? `${progresso} · ${pct}\u00a0%` : progresso
                return (
                  <Link
                    key={row.id}
                    ref={i === 0 ? firstCardRef : undefined}
                    to={href}
                    className="chat-home__card chat-home__card--v4"
                    title={label}
                    aria-label={`${label}. ${meta}. ${cta}`}
                    onClick={() => writeFocusedTrailId(row.trail_id)}
                  >
                    <span className="chat-home__card-main">
                      <TrailOrb
                        pct={pct}
                        hue={i % 2 === 0 ? 'g' : 'y'}
                        size={44}
                      />
                      <span className="chat-home__card-text">
                        <span className="chat-home__card-name cr-fade">{label}</span>
                        <span className="chat-home__card-meta cr-fade">{meta}</span>
                      </span>
                      <TrailChevron className="chat-home__card-chev" />
                    </span>
                    <span className="chat-home__card-foot">
                      <span className="chat-home__card-now">
                        <span className="chat-home__card-now-label">AGORA</span>
                        <span className="chat-home__card-now-value cr-fade">
                          {progresso}
                        </span>
                      </span>
                      <span className="chat-home__card-cta">
                        {cta}
                        <TrailChevron />
                      </span>
                    </span>
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
      </div>

      <form className="chat-home__maria chat-home__maria--v4" onSubmit={onAskMaria}>
        <MariaFace size="composer" />
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
          aria-label="Abrir chat com Maria"
          title="Abrir chat com Maria"
        >
          <SendArrowIcon />
        </button>
      </form>
    </div>
  )
}
