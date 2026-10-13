import type { Timestamp } from 'firebase/firestore'

/** Tipo do stage para o chatbot decidir como processar questões. */
export type TrailStageType = 'ai' | 'fixed' | 'exercise'

export interface TrailStage {
  id: string
  trail_id: string
  stage_number: number
  title: string
  stage_type: TrailStageType
  /** Obrigatório quando `stage_type === "ai"`; `null` para `fixed` e `exercise`. */
  prompt: string | null
  is_released: boolean
  active: boolean
  created_at: Timestamp | null
  updated_at: Timestamp | null
}

