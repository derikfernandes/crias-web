import { useMemo, useState, type MouseEvent } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { getSession } from '../lib/session'
import type { StudentTrailRow, TrailActivity } from '../lib/api'
import { nextHomeGreeting } from '../lib/homeGreeting'
import { MARIA_AGENT_TRAIL_ID } from '../lib/mariaAgent'
import { sortTrailsByLastOpened } from '../lib/trailOpenState'
import { writeFocusedTrailId } from '../lib/trailFocus'
import {
  activityProgressPct,
  formatAtividadeLabel,
  formatEtapaLabel,
} from '../lib/trailProgressLabel'
import { sanitizeUiCopy } from '../lib/sanitizeUiCopy'
import MonitorAvatar from '../components/monitor/MonitorAvatar'
import MonitorBox from '../components/MonitorBox'

type LayoutOutlet = {
  trailRows: StudentTrailRow[] | null
  trailsError: string | null
  trailsLoading: boolean
  retryTrails: () => void
  trailNames?: Record<string, string>
  stageTotals?: Record<string, number>
  questionTotals?: Record<string, number>
  activities?: Record<string, TrailActivity[]>
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
    formatEtapaLabel(
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
    activities,
  } = useOutletContext<LayoutOutlet>()
  const firstName = session.name.split(' ')[0] || 'aluno'
  const [greeting] = useState(() =>
    nextHomeGreeting(session.student_id, firstName),
  )
  const [draft, setDraft] = useState('')

  const empty =
    !trailsLoading && !trailsError && Array.isArray(trailRows) && trailRows.length === 0

  const ordered = useMemo(() => {
    if (!trailRows?.length) return []
    return sortTrailsByLastOpened(session.student_id, trailRows).filter(
      (r) => r.status !== 'blocked',
    )
  }, [trailRows, session.student_id])

  /**
   * Regra do Início: até 2 trilhas, a última aberta primeiro, e só as que ainda não foram
   * concluídas. Trilha já concluída não aparece (continua no menu lateral).
   */
  const visible = ordered.filter((r) => r.status !== 'completed').slice(0, 2)
  /** Todas concluídas: o Início não mostra cards, só um aviso. */
  const allDone = ordered.length > 0 && visible.length === 0
  const homeLoading =
    trailsLoading && visible.length === 0 && !trailsError && !empty && !allDone

  /** v1.0: Enviar abre a Monitoria já com a pergunta enviada. */
  function onAsk() {
    const message = draft.trim()
    if (!message) return
    try {
      sessionStorage.setItem(`crias:maria-draft:${MARIA_AGENT_TRAIL_ID}`, message)
    } catch {
      /* ignore */
    }
    navigate('/monitoria')
  }

  function tilt(e: MouseEvent<HTMLElement>) {
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    el.style.transform = `rotateX(${((0.5 - y) * 14).toFixed(2)}deg) rotateY(${((x - 0.5) * 16).toFixed(2)}deg) translateZ(8px)`
    el.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`)
    el.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`)
  }

  function untilt(e: MouseEvent<HTMLElement>) {
    const el = e.currentTarget
    el.style.transform = 'rotateX(0deg) rotateY(0deg)'
    el.style.setProperty('--gy', '-30%')
  }

  const title = empty || allDone ? `Olá, ${firstName}.` : greeting

  return (
    <>
      <section className="v1-0-home" aria-busy={homeLoading || undefined}>
        <div className="v1-0-home__inner">
          <div className="v1-0-home__sym">
            <MonitorAvatar size={128} entrada />
          </div>
          <h1 className="v1-0-home__title">{title}</h1>
          {trailsError ? (
            <>
              <p className="v1-0-home__err" role="alert">
                Não foi possível carregar suas trilhas.
              </p>
              <button type="button" className="v1-0-home__retry" onClick={retryTrails}>
                Tentar de novo
              </button>
            </>
          ) : empty ? (
            <p className="v1-0-home__empty">Nenhuma trilha liberada para você.</p>
          ) : allDone ? (
            <p className="v1-0-home__empty">Você concluiu todas as suas trilhas.</p>
          ) : homeLoading ? (
            <p className="v1-0-home__loading" role="status">
              Carregando suas trilhas…
            </p>
          ) : (
            <div
              className={`v1-0-grid${visible.length === 1 ? ' v1-0-grid--1' : ''}`}
              style={{ ['--cols' as string]: Math.max(visible.length, 1) }}
            >
              {visible.map((row) => {
                const label = trailNames?.[row.trail_id] || row.trail_id || 'Trilha'
                const { label: progresso, pct, cta } = progressMeta(
                  row,
                  questionTotals?.[row.trail_id],
                  stageTotals?.[row.trail_id],
                )
                const completed = row.status === 'completed'
                const titles = activities?.[row.trail_id] ?? []
                const nowRaw = completed
                  ? 'Trilha concluída'
                  : titles.find((t) => t.number === row.current_question_number)
                      ?.title || `Atividade ${Math.max(row.current_question_number, 1)}`
                const now = sanitizeUiCopy(nowRaw)
                return (
                  <Link
                    key={row.id}
                    to={`/trilha/${encodeURIComponent(row.trail_id)}`}
                    className="v1-0-tcard"
                    title={label}
                    aria-label={`${label}. ${progresso}. ${cta}`}
                    onClick={() => writeFocusedTrailId(row.trail_id)}
                    onMouseMove={tilt}
                    onMouseLeave={untilt}
                  >
                    <span className="v1-0-tcard__glow" aria-hidden="true" />
                    <span className="v1-0-tcard__head">
                      <span className="v1-0-tcard__main">
                        <span className="v1-0-tcard__titlerow">
                          <span className="v1-0-tcard__name" data-fade="1">
                            {label}
                          </span>
                          <svg className="v1-0-tcard__chev" role="img" aria-label={cta} width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#00be85" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                            <title>{cta}</title>
                            <path d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                        <span className="v1-0-bar">
                          <span
                            className="v1-0-bar__fill"
                            style={{ width: `${pct ?? 0}%` }}
                          />
                        </span>
                        <span className="v1-0-tcard__meta" data-fade="1">
                          {progresso}
                        </span>
                      </span>
                    </span>
                    <span className="v1-0-tcard__foot">
                      <span className="v1-0-tcard__now">
                        <span className="v1-0-tcard__nowlabel">AGORA</span>
                        <span className="v1-0-tcard__nowvalue" data-fade="1">
                          {now}
                        </span>
                      </span>
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
          <div className="v1-0-home__composer">
            <MonitorBox draft={draft} onDraft={setDraft} onSend={onAsk} idSuffix="desk" />
          </div>
        </div>
      </section>
      <div className="v1-0-home__dock">
        <MonitorBox draft={draft} onDraft={setDraft} onSend={onAsk} idSuffix="mob" />
      </div>
    </>
  )
}
