import { useMemo, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { getSession } from '../lib/session'
import type { StudentTrailRow, TrailActivity, TrailStageInfo } from '../lib/api'
import { stageLabel, stageRoles } from '../lib/stageRoles'
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
  stageInfos?: Record<string, TrailStageInfo[]>
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
    stageInfos,
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
   * Regra do Início (1.2.5.1 e 1.3.2): a trilha de acesso mais recente vira o cartão principal; as outras
   * (concluídas ou não) ficam em linhas compactas. Trilha concluída continua no Início: "REVEJA A ATIVIDADE",
   * botão "Rever", barra cheia, "AGORA" com a última atividade e "Atividade Y de Y · Trilha concluída".
   * Com todas concluídas, o cartão principal é a concluída mais recente (mesmo layout).
   */
  const visible = ordered
  const homeLoading =
    trailsLoading && visible.length === 0 && !trailsError && !empty

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

  const title = empty ? `Olá, ${firstName}.` : greeting

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
          ) : homeLoading ? (
            <p className="v1-0-home__loading" role="status">
              Carregando suas trilhas…
            </p>
          ) : (
            <div className="v125-home">
              {visible.slice(0, 1).map((row) => {
                const label = trailNames?.[row.trail_id] || row.trail_id || 'Trilha'
                const { label: progresso, pct, cta } = progressMeta(
                  row,
                  questionTotals?.[row.trail_id],
                  stageTotals?.[row.trail_id],
                )
                const titles = activities?.[row.trail_id] ?? []
                const done = row.status === 'completed'
                const nowNumber = done
                  ? Math.max(questionTotals?.[row.trail_id] ?? 0, row.current_question_number, 1)
                  : row.current_question_number
                const now = sanitizeUiCopy(
                  titles.find((t) => t.number === nowNumber)?.title ||
                    (done ? titles[titles.length - 1]?.title : '') ||
                    `Atividade ${Math.max(nowNumber, 1)}`,
                )
                const roles = stageRoles(stageInfos?.[row.trail_id] ?? [])
                const etapa = done
                  ? 'Trilha concluída'
                  : roles.length > 0
                    ? stageLabel(roles, Math.min(roles.length, Math.max(row.current_stage_number, 1)) - 1)
                    : formatEtapaLabel(Math.max(row.current_stage_number, 1), stageTotals?.[row.trail_id])
                const fresh = row.status === 'not_started'
                return (
                  <Link
                    key={row.id}
                    to={`/trilha/${encodeURIComponent(row.trail_id)}`}
                    className="v125-resume"
                    title={label}
                    aria-label={`${label}. ${progresso}. ${cta}`}
                    onClick={() => writeFocusedTrailId(row.trail_id)}
                  >
                    <span className="v125-resume__eyebrow">{fresh ? 'COMECE POR AQUI' : done ? 'REVEJA A ATIVIDADE' : 'CONTINUE DE ONDE PAROU'}</span>
                    <span className="v125-resume__name" data-fade="1">
                      {label}
                    </span>
                    <span className="v1-0-bar">
                      <span className="v1-0-bar__fill" style={{ width: `${pct ?? 0}%` }} />
                    </span>
                    <span className="v125-resume__meta" data-fade="1">
                      {[progresso, etapa].filter(Boolean).join(' · ')}
                    </span>
                    <span className="v125-resume__foot">
                      <span className="v1-0-tcard__now">
                        <span className="v1-0-tcard__nowlabel">AGORA</span>
                        <span className="v1-0-tcard__nowvalue" data-fade="1">
                          {now}
                        </span>
                      </span>
                      <span className="v125-resume__cta">
                        {cta}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                      </span>
                    </span>
                  </Link>
                )
              })}
              {visible.length > 1 ? (
                <div className="v125-rows">
                  {visible.slice(1).map((row) => {
                    const label = trailNames?.[row.trail_id] || row.trail_id || 'Trilha'
                    const { label: progresso, cta } = progressMeta(
                      row,
                      questionTotals?.[row.trail_id],
                      stageTotals?.[row.trail_id],
                    )
                    return (
                      <Link
                        key={row.id}
                        to={`/trilha/${encodeURIComponent(row.trail_id)}`}
                        className="v125-row"
                        title={label}
                        aria-label={`${label}. ${progresso}. ${cta}`}
                        onClick={() => writeFocusedTrailId(row.trail_id)}
                      >
                        <span className="v125-row__name" data-fade="1">
                          {label}
                        </span>
                        <span className="v125-row__meta">{progresso}</span>
                        <svg className="v1-0-tcard__chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00be85" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    )
                  })}
                </div>
              ) : null}
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
