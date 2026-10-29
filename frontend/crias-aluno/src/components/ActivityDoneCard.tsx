import { useEffect, useState } from 'react'
import { fetchStudentPanel } from '../lib/api'
import { minutesLeft, type StageRole } from '../lib/stageRoles'

/**
 * Fechamento da atividade (1.2.5.5, 1.2.5.7, 1.2.5.11): sem caixa, o mesmo conteúdo sobre o fundo branco.
 * Check verde, "Atividade concluída", nome, etapas, "X de Y exercícios certos" com barra, tempo e "PRÓXIMA".
 * O tempo é a estimativa da régua (1 min por conteúdo, feedback e conclusão; 2 min por exercício), porque o
 * banco ainda não guarda o tempo de estudo por atividade (TODO backend 1.2.5: tempo de estudo por atividade).
 */
export default function ActivityDoneCard({
  name,
  nextName,
  roles,
  studentId,
  trailId,
  number,
}: {
  name: string
  nextName: string
  roles: StageRole[]
  studentId: string
  trailId: string
  number: number
}) {
  const [score, setScore] = useState<{ correct: number; wrong: number } | null>(null)
  useEffect(() => {
    let alive = true
    void fetchStudentPanel(studentId)
      .then((p) => {
        if (!alive) return
        const row = p.performance.by_activity.find((a) => a.trail_id === trailId && a.number === number)
        setScore(row ? { correct: row.correct, wrong: row.wrong } : null)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [studentId, trailId, number])

  const total = score ? score.correct + score.wrong : 0
  const pct = total > 0 && score ? Math.round((score.correct / total) * 100) : null
  const minutes = minutesLeft(roles, 0)
  return (
    <section className="v125-done" role="status" aria-label="Atividade concluída">
      <span className="v125-check" aria-hidden="true">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#00be85" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" pathLength="1" />
        </svg>
      </span>
      <div className="v125-done__body">
        <h2>Atividade concluída</h2>
        {name ? <p className="v125-done__name">{name}</p> : null}
        <dl className="v125-done__stats">
          {roles.length > 0 ? (
            <div>
              <dt>Etapas</dt>
              <dd>{roles.length}</dd>
            </div>
          ) : null}
          <div>
            <dt>Exercícios certos</dt>
            <dd>{score && total > 0 ? `${score.correct} de ${total}` : 'N/A'}</dd>
          </div>
          {roles.length > 0 ? (
            <div>
              <dt>Tempo de estudo</dt>
              <dd>cerca de {minutes} min</dd>
            </div>
          ) : null}
        </dl>
        {pct != null ? (
          <span className="v1-0-bar" role="img" aria-label={`${pct}% de acerto`}>
            <span className="v1-0-bar__fill" style={{ width: `${pct}%` }} />
          </span>
        ) : null}
        {nextName ? (
          <p className="v125-done__next">
            <span>PRÓXIMA</span> {nextName}
          </p>
        ) : null}
      </div>
    </section>
  )
}
