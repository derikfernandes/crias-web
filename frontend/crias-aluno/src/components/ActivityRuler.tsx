import { useEffect, useRef, useState } from 'react'
import type { StageRole } from '../lib/stageRoles'
import { stageLabel } from '../lib/stageRoles'

/**
 * Régua da atividade (1.2.5.2, 1.2.5.7 a 1.2.5.9, 1.2.5.11 e 1.3.1), igual ao protótipo `Crias Aluno.dc.html`:
 * - nome da atividade em preto (Outfit 15px 600, esmaece no fim);
 * - um segmento por etapa nas cores da Gestão (conteúdo #00be85, exercício #ffd500, feedback #88cde7,
 *   conclusão #e9e1c6). Feita e atual: cor cheia, sem piscar e sem transição. À frente: fundo cinza com
 *   contorno na cor do tipo;
 * - tocar num segmento feito mostra o rótulo por 1,8s e rola a conversa até a etapa (`onGo`);
 * - abaixo: "Etapa X de Y" em negrito à esquerda ("Exercício Z de W" no exercício e no feedback dele;
 *   na conclusão, "Etapa X de Y") e "Atividade X de Y" à direita;
 * - 1.3.1: esmaecimento de 24px abaixo da régua (o conteúdo que rola some por baixo), sem caixa.
 */
export default function ActivityRuler({
  roles,
  current,
  completed,
  activityName,
  activityNumber,
  activityTotal,
  onGo,
}: {
  roles: StageRole[]
  /** Etapa atual, base 0. */
  current: number
  completed: boolean
  activityName: string
  activityNumber: number | null
  activityTotal: number | null
  /** Rola a conversa até a etapa (base 0). */
  onGo?: (index: number) => void
}) {
  const [tip, setTip] = useState<number | null>(null)
  const timer = useRef<number | null>(null)
  useEffect(() => () => {
    if (timer.current != null) window.clearTimeout(timer.current)
  }, [])
  if (roles.length === 0) return null
  const n = roles.length
  const idx = Math.min(n - 1, Math.max(0, current))
  const pos = completed ? n : idx
  let labelIdx = idx
  if (roles[labelIdx] === 'f') labelIdx -= 1
  const lineLabel = roles[labelIdx] === 'k' ? `Etapa ${labelIdx + 1} de ${n}` : stageLabel(roles, labelIdx)
  const activity =
    activityNumber != null
      ? activityTotal
        ? `Atividade ${activityNumber} de ${Math.max(activityTotal, activityNumber)}`
        : `Atividade ${activityNumber}`
      : ''
  return (
    <div className="v125-ruler">
      <div className="v125-ruler__col">
        {activityName ? (
          <span className="v125-ruler__name" data-fade="1">
            {activityName}
          </span>
        ) : null}
        <div className="v125-ruler__bar" role="list" aria-label="Etapas da atividade" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          {roles.map((r, i) => {
            const done = i < pos
            const now = i === pos
            const label = stageLabel(roles, i)
            return (
              <button
                key={i}
                type="button"
                role="listitem"
                className={`v125-seg v125-seg--${r}${done || now ? ' is-on' : ''}`}
                aria-label={`${label}${done ? ', feita' : now ? ', atual' : ''}`}
                disabled={!done}
                onClick={() => {
                  setTip(i)
                  if (timer.current != null) window.clearTimeout(timer.current)
                  timer.current = window.setTimeout(() => setTip(null), 1800)
                  onGo?.(i)
                }}
              >
                <span className="v125-seg__bar" />
                {tip === i ? <span className={`v125-seg__tip${i >= n / 2 ? ' is-right' : ''}`}>{label}</span> : null}
              </button>
            )
          })}
        </div>
        <div className="v125-ruler__line">
          <strong data-fade="1">{lineLabel}</strong>
          {activity ? <span>{activity}</span> : null}
        </div>
      </div>
      <div className="v125-ruler__fade" aria-hidden="true" />
    </div>
  )
}
