import type {
  DocumentSnapshot,
  QueryDocumentSnapshot,
  Timestamp,
} from 'firebase/firestore'

import type { ExerciseAttempt } from '../types/exerciseAttempt'

export const EXERCISE_ATTEMPTS_COLLECTION = 'exercise_attempts'

function asTimestampOrNull(value: unknown): Timestamp | null {
  if (!value || typeof value !== 'object') return null
  if (
    'toDate' in value &&
    typeof (value as { toDate?: unknown }).toDate === 'function' &&
    'toMillis' in value &&
    typeof (value as { toMillis?: unknown }).toMillis === 'function'
  ) {
    return value as Timestamp
  }
  return null
}

export function snapshotToExerciseAttempt(
  d: DocumentSnapshot | QueryDocumentSnapshot,
): ExerciseAttempt {
  const data = d.data()
  if (!data) {
    return {
      id: d.id,
      student_id: '',
      institution_id: '',
      trail_id: '',
      stage_number: 0,
      question_number: 0,
      student_answer: '',
      correct_option: '',
      is_correct: false,
      score: null,
      feedback: null,
      attempt_number: 0,
      attempted_at: null,
      created_at: null,
      updated_at: null,
    }
  }

  const body = data as Record<string, unknown>

  const stageRaw = body.stage_number
  const questionRaw = body.question_number
  const attemptRaw = body.attempt_number
  const scoreRaw = body.score

  const stage_number =
    typeof stageRaw === 'number' && Number.isFinite(stageRaw) && stageRaw >= 1
      ? stageRaw
      : 0

  const question_number =
    typeof questionRaw === 'number' &&
    Number.isFinite(questionRaw) &&
    questionRaw >= 1
      ? questionRaw
      : 0

  const attempt_number =
    typeof attemptRaw === 'number' &&
    Number.isFinite(attemptRaw) &&
    attemptRaw >= 1
      ? attemptRaw
      : 0

  const score =
    typeof scoreRaw === 'number' && Number.isFinite(scoreRaw) ? scoreRaw : null

  const is_correct =
    typeof body.is_correct === 'boolean' ? body.is_correct : false

  return {
    id: d.id,
    student_id:
      typeof body.student_id === 'string' ? (body.student_id as string) : '',
    institution_id:
      typeof body.institution_id === 'string'
        ? (body.institution_id as string)
        : '',
    trail_id:
      typeof body.trail_id === 'string' ? (body.trail_id as string) : '',
    stage_number,
    question_number,
    student_answer:
      typeof body.student_answer === 'string'
        ? (body.student_answer as string)
        : '',
    correct_option:
      typeof body.correct_option === 'string'
        ? (body.correct_option as string)
        : '',
    is_correct,
    score,
    feedback:
      typeof body.feedback === 'string'
        ? (body.feedback as string)
        : body.feedback === null
          ? null
          : null,
    attempt_number,
    attempted_at: asTimestampOrNull(body.attempted_at),
    created_at: asTimestampOrNull(body.created_at),
    updated_at: asTimestampOrNull(body.updated_at),
  }
}

