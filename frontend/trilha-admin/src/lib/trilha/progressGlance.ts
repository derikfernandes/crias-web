/**
 * Copy do glance da home (Já fez / Agora) — alinhado a path + progresso.
 */

export function glanceDoneSummary(input: {
  stageNumber: number
  totalStages?: number | null
  completed?: boolean
}): string {
  const stage = Math.max(1, Math.floor(input.stageNumber) || 1)
  const total =
    typeof input.totalStages === 'number' &&
    Number.isFinite(input.totalStages) &&
    input.totalStages > 0
      ? Math.floor(input.totalStages)
      : null

  // Concluída: cursor ainda aponta para a última etapa — não usar stage-1.
  if (input.completed) {
    if (total !== null) {
      return `${total} de ${total} etapas concluídas.`
    }
    return 'Todas as etapas concluídas.'
  }

  const stagesDone = Math.max(0, stage - 1)
  if (stagesDone === 0) {
    return 'Ainda no começo — nenhuma etapa concluída.'
  }
  if (total !== null) {
    return `${stagesDone} de ${total} etapas concluídas.`
  }
  return `${stagesDone} etapa${stagesDone === 1 ? '' : 's'} concluída${
    stagesDone === 1 ? '' : 's'
  }.`
}

export function glanceNowLabel(input: {
  stageNumber: number
  questionNumber: number
  statusLabel: string
  completed?: boolean
}): { primary: string; status: string | null } {
  if (input.completed) {
    return { primary: 'Trilha concluída', status: null }
  }
  return {
    primary: `Etapa ${input.stageNumber} · Questão ${input.questionNumber}`,
    status: input.statusLabel,
  }
}
