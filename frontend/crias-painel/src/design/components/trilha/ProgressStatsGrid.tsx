export type ProgressStatsGridProps = {
  progressPct: number | null
  stagesDone: number
  totalStages: number | null
  totalQuestions: number | null
  stageNumber: number
  questionNumber: number
  habitLine?: string | null
  completed?: boolean
  doneSummary?: string | null
  nowPrimary?: string | null
  nowStatus?: string | null
}

export function ProgressStatsGrid({
  progressPct,
  stagesDone,
  totalStages,
  totalQuestions,
  stageNumber,
  questionNumber,
  habitLine = null,
  completed = false,
  doneSummary = null,
  nowPrimary = null,
  nowStatus = null,
}: ProgressStatsGridProps) {
  const pct =
    progressPct === null
      ? null
      : Math.max(0, Math.min(100, Math.round(progressPct * 100)))
  const pctLabel = pct === null ? '—' : `${pct}%`
  /** I-MAP-3: etapas = fases (`total_stages`), não aulas. */
  const stagesLabel =
    totalStages != null && totalStages > 0
      ? `${completed ? totalStages : stagesDone}/${totalStages}`
      : `${stagesDone}`
  const aulaLabel =
    totalQuestions != null && totalQuestions > 0
      ? `${questionNumber}/${totalQuestions}`
      : `${questionNumber}`
  const ritmoLabel = habitLine ? '●' : '—'

  const agoraPrimary =
    nowPrimary ??
    (completed
      ? 'Trilha concluída'
      : `Etapa ${stageNumber} · Questão ${questionNumber}`)
  const agoraStatus = completed ? null : (nowStatus ?? null)

  return (
    <div className="trilha-stats" aria-label="Resumo do progresso">
      <div className="trilha-stats__grid trilha-stats__grid--four">
        <div className="trilha-stats__cell">
          <span className="trilha-stats__value">{pctLabel}</span>
          <span className="trilha-stats__label">Progresso</span>
        </div>
        <div className="trilha-stats__cell">
          <span className="trilha-stats__value">{stagesLabel}</span>
          <span className="trilha-stats__label">Fases</span>
        </div>
        <div className="trilha-stats__cell">
          <span className="trilha-stats__value">{aulaLabel}</span>
          <span className="trilha-stats__label">Aula</span>
        </div>
        <div className="trilha-stats__cell">
          <span className="trilha-stats__value trilha-stats__value--habit">
            {ritmoLabel}
          </span>
          <span className="trilha-stats__label">Ritmo</span>
        </div>
      </div>
      {habitLine ? (
        <p className="trilha-stats__habit muted">{habitLine}</p>
      ) : null}

      {pct !== null ? (
        <div
          className="trilha-progress__bar trilha-stats__bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label="Progresso estimado na trilha"
        >
          <div
            className="trilha-progress__bar-fill"
            style={{ width: `${pct}%` }}
          />
          <span className="trilha-progress__pct" aria-hidden="true">
            {pct}%
          </span>
        </div>
      ) : null}

      <p className="trilha-stats__glance muted">
        {doneSummary ? <span>{doneSummary}</span> : null}
        {doneSummary && agoraPrimary ? ' · ' : null}
        {agoraPrimary ? (
          <span>
            Agora: {agoraPrimary}
            {agoraStatus ? ` · ${agoraStatus}` : null}
          </span>
        ) : null}
      </p>
    </div>
  )
}
