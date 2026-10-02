export type TrailChannel = 'whatsapp' | 'app' | 'admin'

export type StudentTrailStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'blocked'

export type StageType = 'ai' | 'fixed' | 'exercise'

export type NextAction =
  | 'deliver_content'
  | 'await_answer'
  | 'blocked'
  | 'completed'
  | 'await_release'

export type AdvanceReason =
  | 'delivered'
  | 'answered'
  | 'skip'
  | 'legacy_primitive'
  | 'legacy_update_position'

export type LegacyPrimitive = 'advance_stage' | 'advance_question'

export type LastDelivered = {
  stage_number: number
  question_number: number
  content_fingerprint: string
}

export type StudentTrailProgress = {
  id: string
  student_id: string
  institution_id: string
  trail_id: string
  current_stage_number: number
  current_question_number: number
  status: StudentTrailStatus
  progress_version: number
  last_idempotency_key: string | null
  last_channel: TrailChannel | null
  last_delivered: LastDelivered | null
  last_advance_at: unknown | null
  started_at: unknown | null
  completed_at: unknown | null
  last_interaction_at: unknown | null
  created_at: unknown | null
  updated_at: unknown | null
}

export type ResolvedStudent = {
  student_id: string
  institution_id: string
  active: boolean
  name: string
  phone_number: string
  matched_variant: string
}

export type NextContentSource = 'persisted_delivery' | 'curriculum' | 'none'

export type AiContentStatus = 'ready' | 'pending' | 'not_applicable'

export type NextContentResult = {
  status: 'ok' | 'blocked' | 'completed' | 'await_release'
  student_id: string
  trail_id: string
  stage_number: number
  question_number: number
  stage_type: StageType | null
  prompt: string | null
  content: string | null
  /** De onde veio `content` (paridade WA: preferir `persisted_delivery`). */
  content_source: NextContentSource
  options: unknown
  explanation: string | null
  is_released: boolean
  next_action: NextAction
  progress_version: number
  title: string | null
  /**
   * Para stage `ai`: `ready` = texto de conversation_logs (WA/app);
   * `pending` = falta gerar (GET nunca chama LLM — usar facade ensure-ai).
   */
  ai_status: AiContentStatus
}

export type AdvanceResult = {
  status: 'ok' | 'replay'
  student_id: string
  trail_id: string
  next_stage_number: number
  next_question_number: number
  completed: boolean
  progress_version: number
  channel: TrailChannel | null
  idempotency_key: string | null
}

export type ComputedAdvance = {
  next_stage_number: number
  next_question_number: number
  completed: boolean
  status: StudentTrailStatus
}

export type CollectionNames = {
  students: string
  trails: string
  studentTrails: string
  trailStages: string
  trailStageQuestions: string
  conversationLogs: string
  exerciseAttempts: string
  idempotencyKeys: string
}

export function defaultCollectionNames(
  env: NodeJS.ProcessEnv = process.env,
): CollectionNames {
  return {
    students: env.STUDENTS_COLLECTION ?? 'students',
    trails: env.TRAILS_COLLECTION ?? 'trails',
    studentTrails: env.STUDENT_TRAILS_COLLECTION ?? 'student_trails',
    trailStages: env.TRAIL_STAGES_COLLECTION ?? 'trail_stages',
    trailStageQuestions:
      env.TRAIL_STAGE_QUESTIONS_COLLECTION ?? 'trail_stage_questions',
    conversationLogs: env.CONVERSATION_LOGS_COLLECTION ?? 'conversation_logs',
    exerciseAttempts: env.EXERCISE_ATTEMPTS_COLLECTION ?? 'exercise_attempts',
    idempotencyKeys: env.IDEMPOTENCY_KEYS_COLLECTION ?? 'idempotency_keys',
  }
}
