import { useEffect, useState } from 'react'
import { fetchStudentPanel } from '../lib/api'
import { minutesLeft, type StageRole } from '../lib/stageRoles'

/**
 * Caixa de conclusão (1.2.5.5, 1.2.5.7, 1.2.5.10 a 1.2.5.12), igual ao protótipo `Crias Aluno.dc.html`:
 * centrada e sem caixa, check verde num círculo verde claro (o círculo surge e o V é desenhado de uma vez),
 * título, nome, três números (etapas ou atividades; exercícios certos com barra; minutos de estudo) e, na
 * atividade, "PRÓXIMA" com o nome da próxima atividade e "Atividade X de Y".
 * - `kind="activity"`: "Atividade concluída". `kind="trail"`: "Trilha concluída" (atividades, exercícios certos e
 *   tempo da trilha, sem "Próxima").
 * Exercícios certos vêm do painel (`performance.by_activity` / `by_trail`). O tempo é a estimativa da régua
 * (1 min por conteúdo, feedback e conclusão; 2 min por exercício): TODO backend 1.2.5: tempo de estudo real.
 */
export default function ActivityDoneCard({
  kind = 'activity',
  name,
  nextName,
  nextMeta,
  roles,
  activitiesTotal,
  studentId,
  trailId,
  number,
  animate = true,
}: {
  kind?: 'activity' | 'trail'
  name: string
  nextName?: string
  /** "Atividade X de Y" da próxima. */
  nextMeta?: string
  roles: StageRole[]
  /** Trilha: número de atividades. */
  activitiesTotal?: number
  studentId: string
  trailId: string
  number: number
  animate?: boolean
}) {
  const [score, setScore] = useState<{ correct: number; wrong: number } | null>(null)
  useEffect(() => {
    let alive = true
    void fetchStudentPanel(studentId)
      .then((p) => {
        if (!alive) return
        const row =
          kind === 'trail'
            ? p.performance.by_trail.find((t) => t.trail_id === trailId)
            : p.performance.by_activity.find((a) => a.trail_id === trailId && a.number === number)
        setScore(row ? { correct: row.correct, wrong: row.wrong } : null)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [studentId, trailId, number, kind])

  const total = score ? score.correct + score.wrong : 0
  const pct = total > 0 && score ? Math.round((score.correct / total) * 100) : 0
  const perActivity = minutesLeft(roles, 0)
  const minutes = kind === 'trail' ? perActivity * Math.max(1, activitiesTotal ?? 1) : perActivity
  const first =
    kind === 'trail'
      ? { value: activitiesTotal ? String(activitiesTotal) : 'N/A', label: activitiesTotal === 1 ? 'atividade' : 'atividades' }
      : { value: roles.length ? String(roles.length) : 'N/A', label: roles.length === 1 ? 'etapa' : 'etapas' }
  return (
    <div className={`v125-done${animate ? ' is-new' : ''}`} role="status" aria-label={kind === 'trail' ? 'Trilha concluída' : 'Atividade concluída'}>
      <div className="v125-done__col">
        <span className="v125-done__chk" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#00be85" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" pathLength="1" />
          </svg>
        </span>
        <div className="v125-done__head">
          <span className="v125-done__title">{kind === 'trail' ? 'Trilha concluída' : 'Atividade concluída'}</span>
          {name ? (
            <span className="v125-done__name" data-fade="1">
              {name}
            </span>
          ) : null}
        </div>
        <div className="v125-done__tiles">
          <div>
            <strong>{first.value}</strong>
            <span>{first.label}</span>
          </div>
          <div>
            <strong>{score && total > 0 ? `${score.correct} de ${total}` : 'N/A'}</strong>
            <span>exercícios certos</span>
            <span className="v125-done__bar">
              <span style={{ width: `${pct}%` }} />
            </span>
          </div>
          <div>
            <strong>{roles.length ? `${minutes} min` : 'N/A'}</strong>
            <span>de estudo</span>
          </div>
        </div>
        {kind === 'activity' && nextName ? (
          <div className="v125-done__next">
            <div>
              <span>PRÓXIMA</span>
              <strong data-fade="1">{nextName}</strong>
            </div>
            {nextMeta ? <em>{nextMeta}</em> : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
