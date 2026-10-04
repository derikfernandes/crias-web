/**
 * Mapa de etapas para a home — só posição do motor (sem progresso paralelo).
 */

export type TrailPathNodeState = 'done' | 'current' | 'upcoming' | 'paused'

export type TrailPathNode = {
  stageNumber: number
  state: TrailPathNodeState
}

export type StageTypeHint = 'fixed' | 'exercise' | 'ai' | null | undefined

/**
 * Constrói nós do path a partir do cursor Firebase.
 * Com total_stages: mostra todas (cap visual no CSS se muitas).
 * Sem total: janela relativa (anteriores + atual + próximo).
 * mode compact: no máx. 5 nós centrados no atual (Ciclo 1 waypoints).
 */
export function buildTrailPathNodes(
  currentStage: number,
  totalStages: number | null,
  opts?: {
    completed?: boolean
    paused?: boolean
    compact?: boolean
  },
): TrailPathNode[] {
  const stage = Math.max(1, Math.floor(currentStage) || 1)
  const completed = Boolean(opts?.completed)
  const paused = Boolean(opts?.paused)

  const mark = (i: number): TrailPathNodeState => {
    if (completed || i < stage) return 'done'
    if (i === stage) return paused ? 'paused' : 'current'
    return 'upcoming'
  }

  let nodes: TrailPathNode[] = []

  if (typeof totalStages === 'number' && Number.isFinite(totalStages) && totalStages >= 1) {
    const total = Math.max(1, Math.floor(totalStages))
    for (let i = 1; i <= total; i += 1) {
      nodes.push({ stageNumber: i, state: mark(i) })
    }
  } else {
    const start = Math.max(1, stage - 2)
    const end = stage + 1
    for (let i = start; i <= end; i += 1) {
      nodes.push({ stageNumber: i, state: mark(i) })
    }
  }

  if (opts?.compact && nodes.length > 5) {
    const idx = nodes.findIndex((n) => n.stageNumber === stage)
    const from = Math.max(0, idx - 2)
    nodes = nodes.slice(from, from + 5)
  }

  return nodes
}

export function sessionEffortHint(
  nextAction:
    | 'deliver_content'
    | 'await_answer'
    | 'await_release'
    | 'blocked'
    | 'completed'
    | null
    | undefined,
  stageType: StageTypeHint,
): string | null {
  if (
    nextAction === 'await_release' ||
    nextAction === 'blocked' ||
    nextAction === 'completed'
  ) {
    return null
  }
  if (nextAction === 'await_answer' || stageType === 'exercise') {
    return 'Próximo passo: 1 exercício (~3–5 min)'
  }
  if (stageType === 'ai') {
    return 'Próximo passo: atividade com IA (leitura curta)'
  }
  if (nextAction === 'deliver_content' || stageType === 'fixed') {
    return 'Próximo passo: leitura curta (~3–5 min)'
  }
  return null
}

export function nowFocusCopy(
  nextAction:
    | 'deliver_content'
    | 'await_answer'
    | 'await_release'
    | 'blocked'
    | 'completed'
    | null
    | undefined,
  stageNumber: number,
  questionNumber: number,
  stageType?: StageTypeHint,
): { title: string; detail: string; cta: string | null } {
  const pos = `Etapa ${stageNumber} · Questão ${questionNumber}`
  switch (nextAction) {
    case 'deliver_content':
      return {
        title: 'Continuar de onde parou',
        detail: `Ler o conteúdo de ${pos}.`,
        cta: 'Continuar de onde parou',
      }
    case 'await_answer':
      return {
        title: 'Continuar de onde parou',
        detail: `Responder o exercício de ${pos}.`,
        cta:
          stageType === 'exercise' || nextAction === 'await_answer'
            ? 'Responder exercício'
            : 'Continuar de onde parou',
      }
    case 'await_release':
      return {
        title: 'Pausa — aguardando liberação',
        detail: `O próximo passo (${pos}) ainda não foi liberado. O seu progresso está seguro.`,
        cta: null,
      }
    case 'blocked':
      return {
        title: 'Trilha pausada',
        detail: 'Não é possível continuar neste momento. Fale com a escola.',
        cta: null,
      }
    case 'completed':
      return {
        title: 'Trilha concluída',
        detail:
          'Você percorreu todos os passos. Revise o que aprendeu quando quiser.',
        cta: null,
      }
    default:
      return {
        title: 'Continuar de onde parou',
        detail: pos,
        cta: 'Continuar de onde parou',
      }
  }
}

/** Posição na unidade: "2 de 5 nesta etapa" quando total conhecido. */
export function unitPositionLabel(
  questionNumber: number,
  totalQuestions: number | null | undefined,
): string | null {
  if (
    typeof totalQuestions !== 'number' ||
    !Number.isFinite(totalQuestions) ||
    totalQuestions < 1
  ) {
    return null
  }
  const q = Math.max(1, Math.floor(questionNumber) || 1)
  const total = Math.floor(totalQuestions)
  return `${Math.min(q, total)} de ${total} nesta etapa`
}
