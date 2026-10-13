/**
 * Vocabulário INTERFACE: trilha > atividade (question) > etapa (stage).
 * Home/menu: "Atividade X de Y". Topo: "Atividade X de Y · Etapa A de B".
 */

export function formatAtividadeLabel(
  activity: number | null | undefined,
  totalActivities: number | null | undefined,
): string | null {
  if (activity == null || !Number.isFinite(activity) || activity < 1) return null
  const n = Math.max(1, Math.floor(activity))
  if (
    totalActivities != null &&
    Number.isFinite(totalActivities) &&
    totalActivities > 0
  ) {
    const total = Math.max(totalActivities, n)
    return `Atividade ${n} de ${total}`
  }
  return `Atividade ${n}`
}

export function formatEtapaLabel(
  step: number | null | undefined,
  totalSteps: number | null | undefined,
): string | null {
  if (step == null || !Number.isFinite(step) || step < 1) return null
  const n = Math.max(1, Math.floor(step))
  if (totalSteps != null && Number.isFinite(totalSteps) && totalSteps > 0) {
    const total = Math.max(totalSteps, n)
    return `Etapa ${n} de ${total}`
  }
  return `Etapa ${n}`
}

/** Topbar do player: "Atividade X de Y · Etapa A de B". */
export function formatTrailChromeProgress(input: {
  activity: number | null | undefined
  totalActivities: number | null | undefined
  step: number | null | undefined
  totalSteps: number | null | undefined
}): string | null {
  const atividade = formatAtividadeLabel(input.activity, input.totalActivities)
  const etapa = formatEtapaLabel(input.step, input.totalSteps)
  if (atividade && etapa) return `${atividade} · ${etapa}`
  return atividade || etapa
}

/** % de progresso por atividade (0 no 1º; 100 se concluída). */
export function activityProgressPct(input: {
  activity: number
  totalActivities: number | null | undefined
  completed: boolean
}): number | null {
  const total = input.totalActivities
  if (total == null || !Number.isFinite(total) || total <= 0) return null
  if (input.completed) return 100
  const n = Math.max(1, Math.floor(input.activity))
  return Math.min(
    100,
    Math.max(0, Math.round(((Math.max(n, 1) - 1) / Math.max(total, n)) * 100)),
  )
}
