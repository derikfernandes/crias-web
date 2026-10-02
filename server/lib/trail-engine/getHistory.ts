import type { Firestore } from 'firebase-admin/firestore'

import { requireEnrollment } from './enrollment'
import { TrailEngineError } from './errors'
import type { CollectionNames, StageType } from './types'
import { defaultCollectionNames } from './types'

export type HistoryItem = {
  stage_number: number
  question_number: number
  stage_type: StageType | null
  title: string | null
  content: string | null
  prompt: string | null
  options: unknown
  /** Resposta do aluno (só exercícios); null se não houver tentativa. */
  student_answer: string | null
  is_correct: boolean | null
  attempted_at: string | null
}

export type TrailHistoryResult = {
  status: 'ok'
  student_id: string
  trail_id: string
  current_stage_number: number
  current_question_number: number
  progress_status: string
  items: HistoryItem[]
}

function parseStageType(raw: unknown): StageType | null {
  if (raw === 'ai' || raw === 'fixed' || raw === 'exercise') return raw
  return null
}

function serializeTs(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'object' && value && 'toDate' in value) {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString()
    } catch {
      return null
    }
  }
  if (typeof value === 'string') return value
  return null
}

function isBeforeCursor(
  stage: number,
  question: number,
  cursorStage: number,
  cursorQuestion: number,
): boolean {
  if (stage < cursorStage) return true
  if (stage > cursorStage) return false
  return question < cursorQuestion
}

/**
 * Histórico só-leitura: entregas/questões já ultrapassadas pelo cursor
 * Firebase (`student_trails`). Não inventa store de progresso.
 */
export async function getTrailHistory(
  db: Firestore,
  input: { student_id: string; trail_id: string },
  collections: CollectionNames = defaultCollectionNames(),
): Promise<TrailHistoryResult> {
  const studentId = input.student_id.trim()
  const trailId = input.trail_id.trim()
  if (!studentId || !trailId) {
    throw new TrailEngineError(
      'invalid_payload',
      'student_id e trail_id são obrigatórios.',
    )
  }

  const progress = await requireEnrollment(db, studentId, trailId, collections)
  const cursorStage = progress.current_stage_number
  const cursorQuestion = progress.current_question_number
  const trailCompleted = progress.status === 'completed'

  const [questionsSnap, stagesSnap, attemptsSnap] = await Promise.all([
    db
      .collection(collections.trailStageQuestions)
      .where('trail_id', '==', trailId)
      .get(),
    db.collection(collections.trailStages).where('trail_id', '==', trailId).get(),
    db
      .collection(collections.exerciseAttempts)
      .where('student_id', '==', studentId)
      .get(),
  ])

  const stageTypeByNumber = new Map<number, StageType | null>()
  const stagePromptByNumber = new Map<number, string | null>()
  for (const doc of stagesSnap.docs) {
    const data = (doc.data() ?? {}) as Record<string, unknown>
    const n =
      typeof data.stage_number === 'number' && Number.isFinite(data.stage_number)
        ? data.stage_number
        : null
    if (n === null || n < 1) continue
    stageTypeByNumber.set(n, parseStageType(data.stage_type))
    stagePromptByNumber.set(
      n,
      typeof data.prompt === 'string' ? data.prompt : null,
    )
  }

  type AttemptAgg = {
    student_answer: string
    is_correct: boolean
    attempt_number: number
    attempted_at: string | null
  }
  const attemptByPos = new Map<string, AttemptAgg>()
  for (const doc of attemptsSnap.docs) {
    const data = (doc.data() ?? {}) as Record<string, unknown>
    if (data.trail_id !== trailId) continue
    const stage =
      typeof data.stage_number === 'number' ? data.stage_number : 0
    const question =
      typeof data.question_number === 'number' ? data.question_number : 0
    if (stage < 1 || question < 1) continue
    const attempt_number =
      typeof data.attempt_number === 'number' && Number.isFinite(data.attempt_number)
        ? data.attempt_number
        : 0
    const key = `${stage}:${question}`
    const prev = attemptByPos.get(key)
    if (prev && prev.attempt_number >= attempt_number) continue
    attemptByPos.set(key, {
      student_answer:
        typeof data.student_answer === 'string' ? data.student_answer : '',
      is_correct: data.is_correct === true,
      attempt_number,
      attempted_at: serializeTs(data.attempted_at),
    })
  }

  const items: HistoryItem[] = []
  for (const doc of questionsSnap.docs) {
    const data = (doc.data() ?? {}) as Record<string, unknown>
    const stage =
      typeof data.stage_number === 'number' ? data.stage_number : 0
    const question =
      typeof data.question_number === 'number' ? data.question_number : 0
    if (stage < 1 || question < 1) continue

    const past = trailCompleted
      ? true
      : isBeforeCursor(stage, question, cursorStage, cursorQuestion)
    if (!past) continue

    const active = data.active !== false
    if (!active) continue

    const stage_type = stageTypeByNumber.get(stage) ?? null
    const attempt = attemptByPos.get(`${stage}:${question}`)

    items.push({
      stage_number: stage,
      question_number: question,
      stage_type,
      title: typeof data.title === 'string' ? data.title : null,
      content: typeof data.content === 'string' ? data.content : null,
      prompt:
        stage_type === 'ai' ? (stagePromptByNumber.get(stage) ?? null) : null,
      options: data.options ?? null,
      student_answer: attempt?.student_answer ?? null,
      is_correct: attempt != null ? attempt.is_correct : null,
      attempted_at: attempt?.attempted_at ?? null,
    })
  }

  items.sort((a, b) => {
    if (a.stage_number !== b.stage_number) {
      return a.stage_number - b.stage_number
    }
    return a.question_number - b.question_number
  })

  return {
    status: 'ok',
    student_id: studentId,
    trail_id: trailId,
    current_stage_number: cursorStage,
    current_question_number: cursorQuestion,
    progress_status: progress.status,
    items,
  }
}
