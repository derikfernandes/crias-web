export type QuestionsChartBucket = {
  label: string
  count: number
}

export type QuestionsChartTrailBar = {
  id: string
  label: string
  responses: number
  avgAccuracy: number
}

export type QuestionsChartsProps = {
  studentCount?: number
  questionCount: number
  responseCount: number
  avgAccuracy: number | null
  correctTotal: number
  wrongTotal: number
  accuracyBuckets: QuestionsChartBucket[]
  trailBars: QuestionsChartTrailBar[]
}

function formatPct(v: number | null): string {
  return v === null ? '—' : `${v}%`
}

export function QuestionsCharts({
  questionCount,
  responseCount,
  avgAccuracy,
  correctTotal,
  wrongTotal,
  accuracyBuckets,
  trailBars,
}: QuestionsChartsProps) {
  const bucketMax = Math.max(1, ...accuracyBuckets.map((b) => b.count))
  const trailMax = Math.max(1, ...trailBars.map((b) => b.responses))
  const verdictTotal = correctTotal + wrongTotal
  const correctShare =
    verdictTotal > 0 ? Math.round((correctTotal / verdictTotal) * 100) : 0
  const wrongShare = verdictTotal > 0 ? 100 - correctShare : 0

  return (
    <div className="dashboard-q-charts">
      <div className="dashboard-q-charts__kpis">
        <div className="dashboard-q-charts__kpi">
          <span className="dashboard-q-charts__kpi-label">Questões</span>
          <span className="dashboard-q-charts__kpi-value">{questionCount}</span>
        </div>
        <div className="dashboard-q-charts__kpi">
          <span className="dashboard-q-charts__kpi-label">Respostas</span>
          <span className="dashboard-q-charts__kpi-value">{responseCount}</span>
        </div>
        <div className="dashboard-q-charts__kpi">
          <span className="dashboard-q-charts__kpi-label">% médio de acerto</span>
          <span className="dashboard-q-charts__kpi-value">
            {formatPct(avgAccuracy)}
          </span>
        </div>
      </div>

      <div className="dashboard-q-charts__grid">
        <section className="dashboard-q-charts__card">
          <h3>Distribuição de % de acerto</h3>
          <p className="muted dashboard-q-charts__hint">
            Quantas questões caem em cada faixa.
          </p>
          <ul className="dashboard-q-charts__bars">
            {accuracyBuckets.map((bucket) => (
              <li key={bucket.label}>
                <span className="dashboard-q-charts__bar-label">
                  {bucket.label}
                </span>
                <div
                  className="dashboard-q-charts__bar-track"
                  aria-label={`${bucket.label}: ${bucket.count} questões`}
                >
                  <div
                    className="dashboard-q-charts__bar-fill dashboard-q-charts__bar-fill--accent"
                    style={{
                      width: `${(bucket.count / bucketMax) * 100}%`,
                    }}
                  />
                </div>
                <span className="dashboard-q-charts__bar-value">
                  {bucket.count}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="dashboard-q-charts__card">
          <h3>Acertos × erros</h3>
          <p className="muted dashboard-q-charts__hint">
            Volume total de respostas corrigíveis.
          </p>
          <div
            className="dashboard-q-charts__donut"
            style={{
              background:
                verdictTotal === 0
                  ? 'var(--border)'
                  : `conic-gradient(
                      #16a34a 0% ${correctShare}%,
                      #dc2626 ${correctShare}% 100%
                    )`,
            }}
            role="img"
            aria-label={`Acertos ${correctShare}%, erros ${wrongShare}%`}
          >
            <div className="dashboard-q-charts__donut-hole">
              <strong>{formatPct(avgAccuracy)}</strong>
              <span className="muted">médio</span>
            </div>
          </div>
          <div className="dashboard-q-charts__legend">
            <span>
              <i className="dashboard-q-charts__swatch dashboard-q-charts__swatch--good" />
              Acertos {correctTotal} ({correctShare}%)
            </span>
            <span>
              <i className="dashboard-q-charts__swatch dashboard-q-charts__swatch--bad" />
              Erros {wrongTotal} ({wrongShare}%)
            </span>
          </div>
        </section>

        <section className="dashboard-q-charts__card dashboard-q-charts__card--wide">
          <h3>Respostas por trilha</h3>
          <p className="muted dashboard-q-charts__hint">
            Volume e % médio de acerto nas trilhas filtradas.
          </p>
          {trailBars.length === 0 ? (
            <p className="muted">Nenhuma trilha no filtro atual.</p>
          ) : (
            <ul className="dashboard-q-charts__bars">
              {trailBars.map((trail) => (
                <li key={trail.id}>
                  <span
                    className="dashboard-q-charts__bar-label dashboard-q-charts__bar-label--trail"
                    title={trail.label}
                  >
                    {trail.label}
                  </span>
                  <div className="dashboard-q-charts__bar-track">
                    <div
                      className="dashboard-q-charts__bar-fill dashboard-q-charts__bar-fill--trail"
                      style={{
                        width: `${(trail.responses / trailMax) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="dashboard-q-charts__bar-value">
                    {trail.responses}
                    <span className="muted"> · {trail.avgAccuracy}%</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
