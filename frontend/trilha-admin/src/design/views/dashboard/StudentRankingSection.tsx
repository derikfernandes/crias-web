import type { DashboardRankingRowView } from '../../types/dashboardPageView'
import { formatPct } from './formatPct'

export type StudentRankingSectionProps = {
  rows: DashboardRankingRowView[]
  scopeLabel: string
  weights: { progress: number; interact: number; accuracy: number }
  onWeightsChange: (next: {
    progress: number
    interact: number
    accuracy: number
  }) => void
  showAll: boolean
  onToggleShowAll: () => void
}

export function StudentRankingSection({
  rows,
  scopeLabel,
  weights,
  onWeightsChange,
  showAll,
  onToggleShowAll,
}: StudentRankingSectionProps) {
  const visible = showAll ? rows : rows.slice(0, 10)

  function setWeight(key: 'progress' | 'interact' | 'accuracy', raw: number) {
    const v = Math.max(0, Math.min(100, raw))
    const others = (['progress', 'interact', 'accuracy'] as const).filter(
      (k) => k !== key,
    )
    const rest = 100 - v
    const sum = others.reduce((a, k) => a + weights[k], 0)
    const next = { ...weights, [key]: v }
    others.forEach((k) => {
      next[k] = sum > 0 ? (weights[k] / sum) * rest : rest / others.length
    })
    onWeightsChange(next)
  }

  return (
    <section className="crias-rank" aria-label="Ranking de alunos">
      <div className="crias-rank__head">
        <div>
          <div className="crias-label">Quem mais usa</div>
          <h2
            className="crias-section-title"
            style={{ borderBottom: 0, paddingBottom: 0 }}
          >
            Ranking de alunos
          </h2>
        </div>
        <span className="muted">{scopeLabel}</span>
      </div>

      <div className="crias-rank__weights">
        {(
          [
            ['progress', 'Progresso', 'var(--c-text)'],
            ['interact', 'Interações com tutores', 'var(--c-yellow-800)'],
            ['accuracy', 'Desempenho', 'var(--c-green)'],
          ] as const
        ).map(([key, label, color]) => (
          <label key={key} className="crias-rank__weight">
            <span className="crias-rank__weight-label">
              <i style={{ background: color }} />
              {label}
            </span>
            <span className="crias-rank__weight-input">
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={Math.round(weights[key])}
                onChange={(e) => setWeight(key, Number(e.target.value))}
                aria-label={`Peso de ${label}`}
              />
              <span>%</span>
            </span>
          </label>
        ))}
        <button
          type="button"
          className="btn btn--ghost btn--small"
          onClick={() =>
            onWeightsChange({
              progress: 100 / 3,
              interact: 100 / 3,
              accuracy: 100 / 3,
            })
          }
        >
          Igualar pesos
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="muted">Nenhum aluno no filtro atual.</p>
      ) : (
        <div className="crias-rank__table-wrap">
          <table className="crias-rank__table">
            <thead>
              <tr>
                <th>#</th>
                <th>Aluno</th>
                <th>Progresso</th>
                <th>Interações</th>
                <th>Acerto</th>
                <th>Pontuação</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row, idx) => (
                <tr key={row.studentId}>
                  <td>{String(idx + 1).padStart(2, '0')}</td>
                  <td>
                    <a href={row.href} className="crias-rank__name">
                      {row.name}
                    </a>
                    <div className="muted crias-rank__meta">{row.meta}</div>
                  </td>
                  <td>{formatPct(row.progressPct, 0)}</td>
                  <td>
                    <div>{row.messages} msgs</div>
                    <span
                      className={
                        row.messagesPositive
                          ? 'crias-rank__delta crias-rank__delta--up'
                          : 'crias-rank__delta crias-rank__delta--down'
                      }
                    >
                      {row.messagesVsAvgLabel}
                    </span>
                  </td>
                  <td>{formatPct(row.accuracyPct, 0)}</td>
                  <td>
                    <div className="crias-rank__score-bar" aria-hidden="true">
                      <span
                        style={{
                          width: `${row.segProgress}%`,
                          background: 'var(--c-text)',
                        }}
                      />
                      <span
                        style={{
                          width: `${row.segInteract}%`,
                          background: 'var(--c-yellow)',
                        }}
                      />
                      <span
                        style={{
                          width: `${row.segAccuracy}%`,
                          background: 'var(--c-green)',
                        }}
                      />
                    </div>
                    <strong>{row.score}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 10 ? (
        <button
          type="button"
          className="btn btn--ghost"
          style={{ marginTop: 16 }}
          onClick={onToggleShowAll}
        >
          {showAll
            ? 'Mostrar só os 10 primeiros'
            : `Mostrar todos (${rows.length})`}
        </button>
      ) : null}
    </section>
  )
}
