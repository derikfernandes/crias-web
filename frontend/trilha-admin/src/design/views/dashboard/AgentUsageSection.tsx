import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type {
  DashboardAgentPeriodDays,
  DashboardAgentStudentLink,
  DashboardAgentUsageView,
} from '../../types/dashboardPageView'

type AgentUsageSectionProps = {
  agentUsage: DashboardAgentUsageView
  periodDays: DashboardAgentPeriodDays
  onPeriodDaysChange: (days: DashboardAgentPeriodDays) => void
  loading: boolean
  /** Resposta sem agent_usage — distinto de empty real. */
  unavailable?: boolean
  onRetry?: () => void
  selectedAgentTrailId: string | null
  onSelectAgentTrailId: (trailId: string | null) => void
  selectedAgentStudents: DashboardAgentStudentLink[]
  /** Cobertura sobre alunos ativos (preferida vs coveragePct da turma filtrada). */
  coverageOfActivePct?: number | null
}

function formatInt(n: number): string {
  return Math.round(n).toLocaleString('pt-BR')
}

function formatOneDecimal(n: number): string {
  return (Math.round(n * 10) / 10).toLocaleString('pt-BR', {
    minimumFractionDigits: n % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  })
}

function periodLabel(days: DashboardAgentPeriodDays): string {
  if (days === 7) return 'últimos 7 dias'
  if (days === 30) return 'últimos 30 dias'
  return 'todo o período'
}

function periodDayCount(days: DashboardAgentPeriodDays): number {
  if (days === 7) return 7
  if (days === 30) return 30
  return 120
}

export function AgentUsageSection({
  agentUsage,
  periodDays,
  onPeriodDaysChange,
  loading,
  unavailable = false,
  onRetry,
  selectedAgentTrailId,
  onSelectAgentTrailId,
  selectedAgentStudents,
  coverageOfActivePct = null,
}: AgentUsageSectionProps) {
  void onPeriodDaysChange

  const activeAgents = useMemo(
    () =>
      [...agentUsage.agents]
        .filter((a) => a.messages > 0)
        .sort((a, b) => b.messages - a.messages),
    [agentUsage.agents],
  )

  const barMax = Math.max(1, ...activeAgents.map((a) => a.messages))
  const hasData = agentUsage.totalMessages > 0 && !unavailable
  const showSkeleton = loading && !hasData && !unavailable
  const showKeepPrevious = loading && hasData
  const showUnavailable = unavailable && !loading

  const selectedAgent = agentUsage.agents.find(
    (a) => a.trailId === selectedAgentTrailId,
  )

  const rankedStudents = useMemo(() => {
    return [...selectedAgentStudents].sort((a, b) => {
      if (b.messages !== a.messages) return b.messages - a.messages
      return a.name.localeCompare(b.name, 'pt-BR')
    })
  }, [selectedAgentStudents])

  const days = periodDayCount(periodDays)
  const coverage =
    coverageOfActivePct != null
      ? coverageOfActivePct
      : agentUsage.coveragePct
  const messagesPerDay =
    days > 0 ? agentUsage.totalMessages / days : agentUsage.totalMessages
  const perStudentPerDay =
    agentUsage.uniqueStudents > 0 && days > 0
      ? agentUsage.totalMessages / agentUsage.uniqueStudents / days
      : 0

  return (
    <section
      className={`crias-tutors${loading ? ' crias-tutors--loading' : ''}`}
      aria-label="Conversas com os tutores"
      aria-busy={loading}
      data-testid="agent-usage-section"
    >
      <div className="crias-tutors__kicker">
        Tutores · {periodLabel(periodDays)}
        {showKeepPrevious ? (
          <span className="crias-tutors__busy" role="status">
            · atualizando…
          </span>
        ) : null}
      </div>
      <h2 className="crias-tutors__title">Conversas com os tutores</h2>

      {showSkeleton ? (
        <div
          className="crias-tutors__skeleton"
          aria-hidden="true"
          data-testid="agent-usage-skeleton"
        >
          <div className="crias-tutors__skeleton-grid" />
          <div className="crias-tutors__skeleton-bars" />
        </div>
      ) : showUnavailable ? (
        <div
          className="crias-tutors__error"
          role="alert"
          data-testid="agent-usage-unavailable"
        >
          <p className="banner banner--error">
            Não foi possível carregar o uso dos tutores nesta resposta (campo
            ausente ou incompleto). Isso é diferente de “nenhum uso no período”.
          </p>
          {onRetry ? (
            <button type="button" className="btn btn--small" onClick={onRetry}>
              Tentar novamente
            </button>
          ) : null}
        </div>
      ) : !hasData ? (
        <p
          className="muted crias-tutors__empty"
          data-testid="agent-usage-empty"
        >
          Nenhum uso de tutores no período. Incentive os alunos a consultar os
          tutores fora da trilha quando travarem em um tópico.
        </p>
      ) : (
        <>
          <div className="crias-tutors__grid">
            <div className="crias-tutors__col">
              <div className="crias-tutors__col-label">Consolidado</div>
              <div
                className="crias-tutors__consol"
                aria-label="Indicadores consolidados"
              >
                <div className="crias-tutors__metric">
                  <span className="crias-tutors__metric-label">
                    Alunos que conversaram
                  </span>
                  <span className="crias-tutors__metric-value">
                    {formatInt(agentUsage.uniqueStudents)}
                  </span>
                </div>
                <div className="crias-tutors__metric">
                  <span className="crias-tutors__metric-label">
                    Mensagens por dia
                  </span>
                  <span className="crias-tutors__metric-value">
                    {formatInt(messagesPerDay)}
                  </span>
                </div>
                <div className="crias-tutors__metric">
                  <span className="crias-tutors__metric-label">
                    % dos alunos ativos
                  </span>
                  <span className="crias-tutors__metric-value">
                    {formatOneDecimal(coverage).replace('.', ',')}%
                  </span>
                </div>
                <div className="crias-tutors__metric">
                  <span className="crias-tutors__metric-label">
                    Por aluno, por dia
                  </span>
                  <span className="crias-tutors__metric-value">
                    {formatOneDecimal(perStudentPerDay)}
                  </span>
                </div>
              </div>
            </div>

            <div className="crias-tutors__col">
              <div className="crias-tutors__col-label">Por matéria</div>
              <ul className="crias-tutors__bars">
                {activeAgents.map((agent) => {
                  const selected = selectedAgentTrailId === agent.trailId
                  const width = Math.max(8, (agent.messages / barMax) * 100)
                  return (
                    <li key={agent.trailId}>
                      <button
                        type="button"
                        className={`crias-tutors__bar-btn${
                          selected ? ' crias-tutors__bar-btn--selected' : ''
                        }`}
                        onClick={() =>
                          onSelectAgentTrailId(
                            selected ? null : agent.trailId,
                          )
                        }
                        aria-pressed={selected}
                      >
                        <strong className="crias-tutors__bar-label">
                          {agent.label}
                        </strong>
                        <span className="crias-tutors__bar-track">
                          <span
                            className="crias-tutors__bar-fill"
                            style={{ width: `${width}%` }}
                          />
                        </span>
                        <span className="crias-tutors__bar-meta">
                          <strong>{formatInt(agent.messages)}</strong>
                          <span>
                            {agent.uniqueStudents} aluno
                            {agent.uniqueStudents === 1 ? '' : 's'}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>

          {selectedAgent ? (
            <div className="crias-tutors__detail">
              <div className="crias-tutors__detail-head">
                <div>
                  <h3>{selectedAgent.label}</h3>
                  <p className="muted">
                    {selectedAgent.messages} msgs ·{' '}
                    {selectedAgent.uniqueStudents} alunos · última atividade{' '}
                    {selectedAgent.lastActivityLabel}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn--small btn--ghost"
                  onClick={() => onSelectAgentTrailId(null)}
                >
                  Fechar
                </button>
              </div>
              {rankedStudents.length === 0 ? (
                <p className="muted">Nenhum aluno listado neste tutor.</p>
              ) : (
                <ul className="crias-tutors__students">
                  {rankedStudents.slice(0, 12).map((stu) => (
                    <li key={stu.id}>
                      <Link to={stu.href}>{stu.name}</Link>
                      <span className="muted">
                        {stu.messages} msgs · {stu.lastActivityLabel}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}
