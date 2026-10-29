import type { TrailStageInfo } from './api'

/**
 * Papel de cada etapa da atividade (1.2.5.2): conteúdo, exercício, feedback (etapa de IA logo depois do
 * exercício) e conclusão (a última, de IA, com o título "Conclusão"). Mesma regra da Gestão.
 */
export type StageRole = 'c' | 'e' | 'f' | 'k'

export function stageRoles(stages: TrailStageInfo[]): StageRole[] {
  const roles: StageRole[] = []
  stages.forEach((s, i) => {
    if (s.stage_type === 'exercise') roles.push('e')
    else if (i === stages.length - 1 && /conclus/i.test(s.title)) roles.push('k')
    else if (s.stage_type === 'ai' && roles[i - 1] === 'e') roles.push('f')
    else roles.push('c')
  })
  return roles
}

/** Rótulo da etapa na régua: "Etapa N de T", "Exercício Z de W", "Feedback" ou "Conclusão". */
export function stageLabel(roles: StageRole[], index: number): string {
  const role = roles[index]
  if (role === 'k') return 'Conclusão'
  if (role === 'f') return 'Feedback'
  if (role === 'e') {
    const total = roles.filter((r) => r === 'e').length
    const pos = roles.slice(0, index + 1).filter((r) => r === 'e').length
    return `Exercício ${pos} de ${total}`
  }
  return `Etapa ${index + 1} de ${roles.length}`
}

/** Minutos restantes (frontend, igual à Gestão): 1 por conteúdo, feedback e conclusão; 2 por exercício. */
export function minutesLeft(roles: StageRole[], fromIndex: number): number {
  return roles.slice(Math.max(0, fromIndex)).reduce((n, r) => n + (r === 'e' ? 2 : 1), 0)
}
