import type { HistoryStepHint } from '../../../lib/trilha/unitMap'
import { stepTypeLabel } from '../../../lib/trilha/unitMap'

export type ActivityHistoryPreviewProps = {
  items: HistoryStepHint[]
  maxItems?: number
  onOpenHistory?: () => void
}

export function ActivityHistoryPreview({
  items,
  maxItems = 3,
  onOpenHistory,
}: ActivityHistoryPreviewProps) {
  if (items.length === 0 || !onOpenHistory) return null

  const recent = [...items]
    .sort((a, b) => {
      if (a.stageNumber !== b.stageNumber) return b.stageNumber - a.stageNumber
      return b.questionNumber - a.questionNumber
    })
    .slice(0, maxItems)

  return (
    <section
      className="trilha-activity"
      aria-labelledby="trilha-activity-title"
    >
      <div className="trilha-activity__head">
        <h2 id="trilha-activity-title" className="trilha-home__section-title">
          Atividade recente
        </h2>
        <button
          type="button"
          className="btn btn--ghost btn--small"
          onClick={onOpenHistory}
        >
          Ver revisão
        </button>
      </div>
      <ol className="trilha-activity__timeline">
        {recent.map((item) => {
          const type = stepTypeLabel(item.stageType)
          return (
            <li key={`${item.stageNumber}-${item.questionNumber}`}>
              <span className="trilha-activity__dot" aria-hidden="true" />
              <span className="trilha-activity__body">
                <span className="trilha-activity__meta muted">
                  Etapa {item.stageNumber} · Q{item.questionNumber}
                  {type ? ` · ${type}` : ''}
                </span>
                {item.title ? (
                  <span className="trilha-activity__title">{item.title}</span>
                ) : null}
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
