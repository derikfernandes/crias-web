import type { StageRole } from '../lib/stageRoles'
import { stageLabel } from '../lib/stageRoles'

/**
 * Régua da atividade (1.2.5.2, 1.2.5.7 a 1.2.5.9 e 1.2.5.11): nome da atividade, um segmento por etapa nas cores
 * da Gestão (feita e atual: cor cheia, sem piscar; à frente: contorno), e abaixo "Etapa X de Y" em negrito à
 * esquerda ("Exercício Z de W" no exercício e no feedback dele) e "Atividade X de Y" à direita.
 */
export default function ActivityRuler({
  roles,
  current,
  completed,
  activityName,
  activityNumber,
  activityTotal,
}: {
  roles: StageRole[]
  /** Etapa atual, base 0. */
  current: number
  completed: boolean
  activityName: string
  activityNumber: number | null
  activityTotal: number | null
}) {
  if (roles.length === 0) return null
  const idx = Math.min(roles.length - 1, Math.max(0, current))
  const role = roles[idx]
  // No feedback do exercício a linha continua "Exercício Z de W".
  const lineLabel = role === 'f' ? stageLabel(roles, idx - 1) : stageLabel(roles, idx)
  const activity =
    activityNumber != null ? (activityTotal ? `Atividade ${activityNumber} de ${Math.max(activityTotal, activityNumber)}` : `Atividade ${activityNumber}`) : ''
  return (
    <div className="v125-ruler">
      {activityName ? (
        <span className="v125-ruler__name" data-fade="1">
          {activityName}
        </span>
      ) : null}
      <div className="v125-ruler__bar" role="img" aria-label={`${lineLabel}${activity ? `. ${activity}` : ''}`}>
        {roles.map((r, i) => {
          const filled = completed || i <= idx
          return <span key={i} className={`v125-seg v125-seg--${r}${filled ? ' is-on' : ''}`} title={stageLabel(roles, i)} />
        })}
      </div>
      <div className="v125-ruler__line">
        <strong data-fade="1">{lineLabel}</strong>
        {activity ? <span>{activity}</span> : null}
      </div>
    </div>
  )
}
