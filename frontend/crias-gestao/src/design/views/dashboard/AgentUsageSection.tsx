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
}

const PERIOD_OPTIONS: { value: DashboardAgentPeriodDays; label: string }[] = [
  { value: 30, label: 'Últimos 30 dias' },
  { value: 7, label: 'Últimos 7 dias' },
  { value: 0, label: 'Todo o período' },
]

function formatCompact(n: number): string {
  if (n >= 1000) {
    const k = n / 1000
    return `${k >= 10 ? Math.round(k) : Math.round(k * 10) / 10}k`
  }
  return String(n)
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
}: AgentUsageSectionProps) {
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

  const barWidthPct = (messages: number) => {
    const raw = (messages / barMax) * 100
    // Barras mínimas legíveis (baixo volume vs líder).
    return Math.max(8, raw)
  }

  return (
    <section
      className={`dashboard-agent-usage${loading ? ' dashboard-agent-usage--loading' : ''}`}
      aria-label="Tutores de IA"
      aria-busy={loading}
      data-testid="agent-usage-section"
    >
      <div className="dashboard-agent-usage__header">
        <div>
          <h2 className="dashboard-agent-usage__title">Tutores de IA</h2>
          <p className="muted dashboard-agent-usage__lede">
            Uso dos tutores fora da trilha estruturada — por disciplina.
          </p>
        </div>
        <div className="dashboard-agent-usage__header-actions">
          {showKeepPrevious ? (
            <span className="dashboard-agent-usage__busy" role="status">
              Atualizando…
            </span>
          ) : null}
          <label className="dashboard-agent-usage__period">
            <span className="muted">Período</span>
            <select
              value={periodDays}
              onChange={(e) =>
                onPeriodDaysChange(
                  Number(e.target.value) as DashboardAgentPeriodDays,
                )
              }
              disabled={(loading && !hasData) || showUnavailable}
            >
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {showSkeleton ? (
        <div
          className="dashboard-agent-usage__skeleton"
          aria-hidden="true"
          data-testid="agent-usage-skeleton"
        >
          <div className="dashboard-agent-usage__kpis">
            <div className="dashboard-agent-usage__kpi dashboard-agent-usage__kpi--pulse" />
            <div className="dashboard-agent-usage__kpi dashboard-agent-usage__kpi--pulse" />
            <div className="dashboard-agent-usage__kpi dashboard-agent-usage__kpi--pulse" />
            <div className="dashboard-agent-usage__kpi dashboard-agent-usage__kpi--pulse" />
          </div>
          <div className="dashboard-agent-usage__bars-skeleton" />
        </div>
      ) : showUnavailable ? (
        <div
          className="dashboard-agent-usage__error"
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
          className="muted dashboard-agent-usage__empty"
          data-testid="agent-usage-empty"
        >
          Nenhum uso de tutores no período. Incentive os alunos a consultar os
          tutores fora da trilha quando travarem em um tópico.
        </p>
      ) : (
        <>
          <div className="dashboard-agent-usage__kpis" aria-label="Indicadores">
            <div className="dashboard-agent-usage__kpi">
              <span className="dashboard-agent-usage__kpi-label">Mensagens</span>
              <span className="dashboard-agent-usage__kpi-value">
                {formatCompact(agentUsage.totalMessages)}
              </span>
            </div>
            <div className="dashboard-agent-usage__kpi">
              <span className="dashboard-agent-usage__kpi-label">
                Alunos com tutor
              </span>
              <span className="dashboard-agent-usage__kpi-value">
                {agentUsage.uniqueStudents}
              </span>
            </div>
            <div className="dashboard-agent-usage__kpi">
              <span className="dashboard-agent-usage__kpi-label">
                % da turma
              </span>
              <span className="dashboard-agent-usage__kpi-value">
                {agentUsage.coveragePct}%
              </span>
            </div>
            <div
              className="dashboard-agent-usage__kpi"
              title="Mensagens ÷ tutores com uso ÷ dias do período (ou dias com atividade, se ‘todo o período’)."
            >
              <span className="dashboard-agent-usage__kpi-label">
                Média diária por tutor
              </span>
              <span className="dashboard-agent-usage__kpi-value">
                {agentUsage.msgsPerTutorPerDay}
              </span>
            </div>
          </div>

          <article className="dashboard-agent-usage__volume">
            <h3 className="dashboard-agent-usage__chart-title">
              Volume por tutor
            </h3>
            <ul className="dashboard-agent-usage__bars">
              {activeAgents.map((agent) => {
                const selected = selectedAgentTrailId === agent.trailId
                return (
                  <li key={agent.trailId}>
                    <button
                      type="button"
                      className={`dashboard-agent-usage__bar-btn${
                        selected ? ' dashboard-agent-usage__bar-btn--selected' : ''
                      }`}
                      onClick={() =>
                        onSelectAgentTrailId(selected ? null : agent.trailId)
                      }
                      aria-pressed={selected}
                    >
                      <span className="dashboard-agent-usage__bar-label">
                        {agent.label}
                      </span>
                      <span className="dashboard-agent-usage__bar-track">
                        <span
                          className="dashboard-agent-usage__bar-fill"
                          style={{
                            width: `${barWidthPct(agent.messages)}%`,
                          }}
                        />
                      </span>
                      <span className="dashboard-agent-usage__bar-meta">
                        <strong>{agent.messages}</strong>
                        <span className="muted">
                          {agent.uniqueStudents} aluno
                          {agent.uniqueStudents === 1 ? '' : 's'} ·{' '}
                          {agent.pctOfTotal}%
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </article>

          {selectedAgent ? (
            <div className="dashboard-agent-usage__detail">
              <div className="dashboard-agent-usage__detail-head">
                <div>
                  <h3>{selectedAgent.label}</h3>
                  <p className="muted dashboard-agent-usage__detail-summary">
                    {selectedAgent.messages} msgs ·{' '}
                    {selectedAgent.uniqueStudents} alunos · última atividade{' '}
                    {selectedAgent.lastActivityLabel}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn--ghost btn--small"
                  onClick={() => onSelectAgentTrailId(null)}
                >
                  Fechar
                </button>
              </div>

              {rankedStudents.length === 0 ? (
                <p className="muted">
                  Nenhum aluno identificado neste período para este tutor.
                </p>
              ) : (
                <div className="table-wrap dashboard-agent-usage__detail-table-wrap">
                  <table className="table dashboard-agent-usage__detail-table">
                    <thead>
                      <tr>
                        <th>Aluno</th>
                        <th>Msgs</th>
                        <th>Última</th>
                        <th>
                          <span className="visually-hidden">Abrir</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankedStudents.map((student) => (
                        <tr key={student.id}>
                          <td>
                            <Link
                              className="table__name-link"
                              to={student.href}
                            >
                              {student.name}
                            </Link>
                          </td>
                          <td>{student.messages || '—'}</td>
                          <td>{student.lastActivityLabel}</td>
                          <td>
                            <Link
                              className="btn btn--ghost btn--small"
                              to={student.href}
                            >
                              Abrir
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <p className="muted dashboard-agent-usage__hint">
              Clique em um tutor para ver os alunos com mais uso e abrir o
              histórico filtrado.
            </p>
          )}
        </>
      )}
    </section>
  )
}
