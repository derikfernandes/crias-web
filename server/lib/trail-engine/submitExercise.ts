import type { Firestore } from 'firebase-admin/firestore'

import { createExerciseAttemptWithQuestionLookup } from '../exerciseAttemptService'
import { advance } from './advance'
import { TrailEngineError } from './errors'
import { recordStudentMessage } from './recordMessage'
import type { CollectionNames, TrailChannel } from './types'
import { defaultCollectionNames } from './types'

export type SubmitExerciseInput = {
  student_id: string
  institution_id: string
  trail_id: string
  stage_number: number
  question_number: number
  student_answer: string
  idempotency_key: string
  channel: TrailChannel
  feedback?: string | null
  /** Se true (default), avança progresso após attempt quando aplicável. */
  advance_on_submit?: boolean
  expected_version?: number
}

export type SubmitExerciseResult = {
  attempt_id: string
  is_correct: boolean
  attempt_number: number
  score: number | null
  advanced: boolean
  advance?: {
    next_stage_number: number
    next_question_number: number
    completed: boolean
    progress_version: number
    status: 'ok' | 'replay'
  }
}

/**
 * Regista tentativa de exercício e, opcionalmente, avança na mesma sequência
 * (attempt tx + advance tx). Idempotency-Key cobre o advance.
 */
export async function submitExerciseAnswer(
  db: Firestore,
  input: SubmitExerciseInput,
  collections: CollectionNames = defaultCollectionNames(),
): Promise<SubmitExerciseResult> {
  const key = input.idempotency_key?.trim()
  if (!key) {
    throw new TrailEngineError(
      'invalid_payload',
      'Idempotency-Key é obrigatória para submitExerciseAnswer.',
    )
  }

  const answer = input.student_answer?.trim() ?? ''
  if (!answer) {
    throw new TrailEngineError('invalid_payload', 'student_answer é obrigatório.')
  }

  let attempt: {
    id: string
    is_correct: boolean
    attempt_number: number
    score: number | null
  }

  try {
    attempt = await createExerciseAttemptWithQuestionLookup(
      db,
      collections.exerciseAttempts,
      collections.trailStageQuestions,
      collections.trailStages,
      {
        student_id: input.student_id,
        institution_id: input.institution_id,
        trail_id: input.trail_id,
        stage_number: input.stage_number,
        question_number: input.question_number,
        student_answer: answer,
        feedback: input.feedback ?? null,
      },
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Falha ao registar tentativa.'
    if (/não encontrad/i.test(msg)) {
      throw new TrailEngineError('not_found', msg)
    }
    throw new TrailEngineError('invalid_payload', msg)
  }

  // Chat-first: resposta do aluno entra em conversation_logs (paridade WA).
  await recordStudentMessage(
    db,
    {
      student_id: input.student_id,
      trail_id: input.trail_id,
      stage_number: input.stage_number,
      question_number: input.question_number,
      message_text: answer,
      channel: input.channel,
      institution_id: input.institution_id,
      message_type: 'exercise',
      idempotency_key: `${key}:student_msg`,
      metadata: {
        is_correct: attempt.is_correct,
        attempt_id: attempt.id,
      },
    },
    collections,
  )

  const shouldAdvance = input.advance_on_submit !== false
  if (!shouldAdvance) {
    return {
      attempt_id: attempt.id,
      is_correct: attempt.is_correct,
      attempt_number: attempt.attempt_number,
      score: attempt.score,
      advanced: false,
    }
  }

  const adv = await advance(
    db,
    {
      student_id: input.student_id,
      trail_id: input.trail_id,
      idempotency_key: key,
      channel: input.channel,
      reason: 'answered',
      expected_version: input.expected_version,
      mark_delivered: true,
    },
    collections,
  )

  return {
    attempt_id: attempt.id,
    is_correct: attempt.is_correct,
    attempt_number: attempt.attempt_number,
    score: attempt.score,
    advanced: true,
    advance: {
      next_stage_number: adv.next_stage_number,
      next_question_number: adv.next_question_number,
      completed: adv.completed,
      progress_version: adv.progress_version,
      status: adv.status,
    },
  }
}
