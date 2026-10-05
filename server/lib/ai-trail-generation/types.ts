/**
 * JSON estruturado gerado pela IA — espelha o modelo Crias
 * (phase_blueprint + etapas/questões + blocos por fase).
 */

export type AiTrailPhaseType = 'ai' | 'fixed' | 'exercise'

export type GeneratedPhase = {
  position: number
  name: string
  type: AiTrailPhaseType
  /** Função pedagógica (metadado do prompt; não persistido no Firestore). */
  pedagogicalFunction: string
  /** Comando global da IA; obrigatório quando type === 'ai'. */
  globalAiCommand: string | null
  /** true quando a fase é feedback de exercício. */
  isFeedback: boolean
}

export type GeneratedBlock = {
  phasePosition: number
  /**
   * Conteúdo do bloco:
   * - ai: conteúdo-base
   * - fixed: texto final
   * - exercise: enunciado + alternativas A/B/C no texto
   */
  content: string
  /** Gabarito "1"|"2"|"3" (A/B/C) — obrigatório em exercise. */
  correctOption: string | null
}

export type GeneratedContent = {
  title: string
  blocks: GeneratedBlock[]
}

export type GeneratedStage = {
  name: string
  objective: string
  contents: GeneratedContent[]
}

export type GeneratedTrail = {
  name: string
  objective: string
  subject: string
  phases: GeneratedPhase[]
  stages: GeneratedStage[]
  architecturesConsidered?: string[]
  architectureJustification?: string
}

export type ValidationIssue = {
  code: string
  message: string
  path?: string
}

export type ValidationResult = {
  ok: boolean
  issues: ValidationIssue[]
}
