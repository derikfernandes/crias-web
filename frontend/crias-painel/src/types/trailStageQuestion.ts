import type { Timestamp } from 'firebase/firestore'

export type TrailStageQuestionOption = {
  key: string
  text: string
}

/**
 * Conteúdo sequencial de uma etapa dentro do stage.
 * Comportamento (`stage_type`, `prompt`) fica em `trail_stages`.
 */
export type TrailStageQuestion = {
  id: string
  trail_id: string
  stage_number: number
  question_number: number
  title: string
  content: string
  correct_option: string | null
  options: TrailStageQuestionOption[] | null
  explanation: string | null
  /**
   * Questão anulada (ex.: gabarito do contrato veio errado).
   * Não entra no denominador de acerto/erro; distinta de “sem gabarito”.
   */
  annulled: boolean
  annulled_at: Timestamp | null
  annulled_reason: string | null
  /** Liberada para o aluno no fluxo (substitui controle só no stage). */
  is_released: boolean
  active: boolean
  created_at: Timestamp | null
  updated_at: Timestamp | null
}
