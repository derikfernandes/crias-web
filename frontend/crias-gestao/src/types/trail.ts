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
  /** Objetivo da trilha (Reforço, Revisão... ou texto livre). Campo opcional da v1.1. */
  objective?: string
  /** Orientações para a geração dos conteúdos. Campo opcional da v1.1. */
  guidelines?: string
  /** Alternativas por exercício, de 2 a 6 (padrão 4). Campo opcional da v1.1. */
  options_count?: number
}

