export type ProgressSummaryProps = {
  trailTitle: string
  stageNumber: number
  questionNumber: number
  progressRatio: number | null
  statusLabel: string
  totalStages?: number | null
  /** True quando next_action/status === completed — glance deve ser N de N. */
  completed?: boolean
  /** Resumo curto do que já foi feito (derivado do cursor / completed). */
  doneSummary?: string | null
  /** Label do “Agora”; se omitido, deriva de etapa/questão ou “Trilha concluída”. */
  nowPrimary?: string | null
  nowStatus?: string | null
}

export function ProgressSummary({
  trailTitle,
  stageNumber,
  questionNumber,
  progressRatio,
  statusLabel,
  totalStages = null,
  completed = false,
  doneSummary = null,
  nowPrimary = null,
  nowStatus,
}: ProgressSummaryProps) {
  const pct =
    progressRatio === null
      ? null
      : Math.max(0, Math.min(100, Math.round(progressRatio * 100)))

  const stagesDone = completed
    ? typeof totalStages === 'number' && totalStages > 0
      ? Math.floor(totalStages)
      : Math.max(0, stageNumber)
    : Math.max(0, stageNumber - 1)
  const doneText =
    doneSummary ??
    (completed
      ? typeof totalStages === 'number' && totalStages > 0
        ? `${Math.floor(totalStages)} de ${Math.floor(totalStages)} etapas concluídas.`
        : 'Todas as etapas concluídas.'
      : stagesDone === 0
        ? 'Ainda no começo — nenhuma etapa concluída.'
        : typeof totalStages === 'number' && totalStages > 0
          ? `${stagesDone} de ${totalStages} etapas concluídas.`
          : `${stagesDone} etapa${stagesDone === 1 ? '' : 's'} concluída${stagesDone === 1 ? '' : 's'}.`)

  const agoraPrimary =
    nowPrimary ??
    (completed
      ? 'Trilha concluída'
      : `Etapa ${stageNumber} · Questão ${questionNumber}`)
  const agoraStatus =
    nowStatus !== undefined
      ? nowStatus
      : completed
        ? null
        : statusLabel

  return (
    <div className="trilha-progress">
      <p className="trilha-progress__trail">{trailTitle}</p>
      <dl className="trilha-progress__glance">
        <div className="trilha-progress__glance-item">
          <dt>Já fez</dt>
          <dd>{doneText}</dd>
        </div>
        <div className="trilha-progress__glance-item">
          <dt>Agora</dt>
          <dd>
            {agoraPrimary}
            {agoraStatus ? (
              <span className="trilha-progress__status"> · {agoraStatus}</span>
            ) : null}
          </dd>
        </div>
      </dl>
      {pct !== null ? (
        <div
          className="trilha-progress__bar"
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
    </div>
  )
}
