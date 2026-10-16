import type { Timestamp } from 'firebase/firestore'
import type { TrailStageType } from './trailStage'

/** Modelo de fase salvo na criação da trilha (opcional no documento). */
export type PhaseBlueprint = {
  title: string
  stage_type: TrailStageType
  /** Comando da IA quando `stage_type === 'ai'`; caso contrário `null` (campo `prompt` no Firestore). */
  prompt: string | null
}

export interface Trail {
  id: string
  institution_id: string
  name: string
  description: string
  subject: string
  default_total_steps_per_stage: number
  active: boolean
  created_at: Timestamp | null
  updated_at: Timestamp | null
  phase_blueprint?: PhaseBlueprint[] | null
}

