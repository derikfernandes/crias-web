import type {
  Firestore,
  QuerySnapshot,
  DocumentSnapshot,
} from 'firebase-admin/firestore'
import { FieldValue } from 'firebase-admin/firestore'

import type { ExerciseAttemptCreatePayload } from './exerciseAttemptValidation'
import { answersMatch, resolveExerciseOptions } from './exerciseOptions'
import { extractCorrectLetterFromText } from './trail-ai/blocoSubjectGuard'
import { studentTrailDocId } from './studentTrailService'

export type ExerciseAttemptRuntime = {
  id: string
  student_id: string
  institution_id: string
  trail_id: string
  stage_number: number
  question_number: number
  student_answer: string
  correct_option: string
  is_correct: boolean
  score: number | null
  feedback: string | null
  attempt_number: number
  attempted_at: unknown
  created_at: unknown
  updated_at: unknown
}

/** C2-R23 N02: submit em célula stale / lock paralelo. */
export class ExerciseAttemptConflictError extends Error {
  readonly code = 'conflict'
  constructor(message = 'Etapa desatualizada; re-fetch next-content.') {
    super(message)
    this.name = 'ExerciseAttemptConflictError'
  }
}

const EXERCISE_SUBMIT_LOCK_TTL_MS = 12_000

type QuestionDocData = {
  trail_id?: string
  stage_number?: number
  question_number?: number
  correct_option?: string | null
  annulled?: boolean
}

function readQuestionData(snap: DocumentSnapshot): QuestionDocData {
  const raw = (snap.data() ?? {}) as Record<string, unknown>

  let correct_option: string | null = null
  if (raw.correct_option !== undefined && raw.correct_option !== null) {
    correct_option =
      typeof raw.correct_option === 'string' ? raw.correct_option : null
  }

  return {
    trail_id:
      typeof raw.trail_id === 'string' ? (raw.trail_id as string) : undefined,
    stage_number:
      typeof raw.stage_number === 'number' && Number.isFinite(raw.stage_number)
        ? (raw.stage_number as number)
        : undefined,
    question_number:
      typeof raw.question_number === 'number' &&
      Number.isFinite(raw.question_number)
        ? (raw.question_number as number)
        : undefined,
    correct_option,
    annulled: raw.annulled === true,
  }
}

function readStageTypeFromSnap(snap: DocumentSnapshot): string {
  const raw = (snap.data() ?? {}) as Record<string, unknown>
  const t =
    typeof raw.stage_type === 'string' ? raw.stage_type.trim().toLowerCase() : ''
  return t
}

export async function listExerciseAttemptsByStudent(
  db: Firestore,
  collectionName: string,
  studentId: string,
): Promise<QuerySnapshot> {
  return db
    .collection(collectionName)
    .where('student_id', '==', studentId)
    .orderBy('attempted_at', 'asc')
    .get()
}

export async function listExerciseAttemptsByQuestion(
  db: Firestore,
  collectionName: string,
  trailId: string,
  stageNumber: number,
  questionNumber: number,
): Promise<QuerySnapshot> {
  return db
    .collection(collectionName)
    .where('trail_id', '==', trailId)
    .where('stage_number', '==', stageNumber)
    .where('question_number', '==', questionNumber)
    .orderBy('attempt_number', 'asc')
    .get()
}

export async function countExerciseAttemptsForQuestion(
  db: Firestore,
  collectionName: string,
  studentId: string,
  trailId: string,
  stageNumber: number,
  questionNumber: number,
): Promise<number> {
  const snap = await db
    .collection(collectionName)
    .where('student_id', '==', studentId)
    .where('trail_id', '==', trailId)
    .where('stage_number', '==', stageNumber)
    .where('question_number', '==', questionNumber)
    .get()

  return snap.size
}

export async function getLastExerciseAttemptForQuestion(
  db: Firestore,
  collectionName: string,
  studentId: string,
  trailId: string,
  stageNumber: number,
  questionNumber: number,
): Promise<DocumentSnapshot | null> {
  const snap = await db
    .collection(collectionName)
    .where('student_id', '==', studentId)
    .where('trail_id', '==', trailId)
    .where('stage_number', '==', stageNumber)
    .where('question_number', '==', questionNumber)
    .orderBy('attempt_number', 'desc')
    .limit(1)
    .get()

  if (snap.empty) return null
  return snap.docs[0]
}

export async function createExerciseAttemptWithQuestionLookup(
  db: Firestore,
  attemptsCollection: string,
  questionsCollection: string,
  stagesCollection: string,
  data: ExerciseAttemptCreatePayload,
): Promise<{
  id: string
  is_correct: boolean
  attempt_number: number
  score: number | null
  feedback: string | null
  replay?: boolean
}> {
  const questionsRef = db.collection(questionsCollection)
  const attemptsRef = db.collection(attemptsCollection)
  const stagesRef = db.collection(stagesCollection)
  const studentTrailsCollection =
    process.env.STUDENT_TRAILS_COLLECTION ?? 'student_trails'
  const locksCollection =
    process.env.EXERCISE_SUBMIT_LOCKS_COLLECTION ?? 'exercise_submit_locks'

  const now = FieldValue.serverTimestamp()
  const idempotencyKey =
    typeof data.idempotency_key === 'string' && data.idempotency_key.trim()
      ? data.idempotency_key.trim().slice(0, 128)
      : null
  const lockId = [
    data.student_id,
    data.trail_id,
    String(data.stage_number),
    String(data.question_number),
  ].join('_')

  const result = await db.runTransaction(async (tx) => {
    // C2-R23 N02/N03: posição atual deve ser a célula do submit.
    const trailRef = db
      .collection(studentTrailsCollection)
      .doc(studentTrailDocId(data.student_id, data.trail_id))
    const trailSnap = await tx.get(trailRef)
    if (trailSnap.exists) {
      const trailData = (trailSnap.data() ?? {}) as Record<string, unknown>
      const curStage =
        typeof trailData.current_stage_number === 'number' &&
        Number.isFinite(trailData.current_stage_number)
          ? Math.trunc(trailData.current_stage_number)
          : 1
      const curQuestion =
        typeof trailData.current_question_number === 'number' &&
        Number.isFinite(trailData.current_question_number)
          ? Math.trunc(trailData.current_question_number)
          : 1
      if (
        curStage !== data.stage_number ||
        curQuestion !== data.question_number
      ) {
        throw new ExerciseAttemptConflictError(
          'Etapa desatualizada; re-fetch next-content.',
        )
      }
      if (typeof data.expected_version === 'number') {
        const versionRaw = trailData.progress_version
        const progress_version =
          typeof versionRaw === 'number' &&
          Number.isFinite(versionRaw) &&
          versionRaw >= 0
            ? Math.trunc(versionRaw)
            : 0
        if (data.expected_version !== progress_version) {
          throw new ExerciseAttemptConflictError(
            'progress_version divergente; re-fetch next-content.',
          )
        }
      }
    }

    // Lock curto por célula — 2ª aba / double-submit → replay ou 409.
    const lockRef = db.collection(locksCollection).doc(lockId)
    const lockSnap = await tx.get(lockRef)
    if (lockSnap.exists) {
      const lock = (lockSnap.data() ?? {}) as Record<string, unknown>
      const lockedAtMs =
        typeof lock.locked_at_ms === 'number' && Number.isFinite(lock.locked_at_ms)
          ? lock.locked_at_ms
          : 0
      const fresh = Date.now() - lockedAtMs < EXERCISE_SUBMIT_LOCK_TTL_MS
      if (fresh) {
        const lockKey =
          typeof lock.idempotency_key === 'string' ? lock.idempotency_key : null
        const prevId = typeof lock.attempt_id === 'string' ? lock.attempt_id : null
        if (
          idempotencyKey &&
          lockKey &&
          lockKey === idempotencyKey &&
          prevId
        ) {
          const prevSnap = await tx.get(attemptsRef.doc(prevId))
          if (prevSnap.exists) {
            const prev = (prevSnap.data() ?? {}) as Record<string, unknown>
            return {
              id: prevId,
              is_correct: prev.is_correct === true,
              attempt_number:
                typeof prev.attempt_number === 'number' &&
                Number.isFinite(prev.attempt_number)
                  ? prev.attempt_number
                  : 1,
              score:
                typeof prev.score === 'number' && Number.isFinite(prev.score)
                  ? prev.score
                  : null,
              feedback:
                typeof prev.feedback === 'string'
                  ? prev.feedback
                  : prev.feedback === null
                    ? null
                    : data.feedback ?? null,
              replay: true,
            }
          }
        }
        throw new ExerciseAttemptConflictError(
          'Envio em andamento nesta etapa; aguarde ou re-sincronize.',
        )
      }
    }

    const stageSnap = await tx.get(
      stagesRef.doc(`${data.trail_id}_stage_${data.stage_number}`),
    )
    if (!stageSnap.exists) {
      throw new Error('Stage não encontrado para registrar tentativa.')
    }
    const stage_type = readStageTypeFromSnap(stageSnap)
    if (stage_type !== 'exercise') {
      throw new Error(
        `Apenas stages do tipo "exercise" permitem tentativas (definido em trail_stages). stage_type atual: "${stage_type || 'indefinido'}".`,
      )
    }

    const questionSnap = await tx.get(
      questionsRef.doc(
        `${data.trail_id}_stage_${data.stage_number}_q_${data.question_number}`,
      ),
    )

    if (!questionSnap.exists) {
      throw new Error('Questão não encontrada para registrar tentativa.')
    }

    const q = readQuestionData(questionSnap)
    const questionRaw = (questionSnap.data() ?? {}) as Record<string, unknown>
    const qContent =
      typeof questionRaw.content === 'string' ? questionRaw.content : ''

    if (q.annulled) {
      throw new Error(
        'Questão anulada. Não é possível registrar tentativa nem pontuar acerto/erro.',
      )
    }

    // Lê próxima questão (possível BLOCO com "letra X") antes de qualquer write.
    const nextQSnap = await tx.get(
      questionsRef.doc(
        `${data.trail_id}_stage_${data.stage_number + 1}_q_${data.question_number}`,
      ),
    )

    const attemptsQuery = await tx.get(
      attemptsRef
        .where('student_id', '==', data.student_id)
        .where('trail_id', '==', data.trail_id)
        .where('stage_number', '==', data.stage_number)
        .where('question_number', '==', data.question_number),
    )

    let maxAttempt = 0
    for (const doc of attemptsQuery.docs) {
      const raw = (doc.data() ?? {}) as Record<string, unknown>
      const n = raw.attempt_number
      if (typeof n === 'number' && Number.isFinite(n) && n > maxAttempt) {
        maxAttempt = n
      }
    }

    const attempt_number = maxAttempt + 1
    const studentAnswer = data.student_answer.trim()

    // Gabarito: campo correct_option, ou inferência da letra no BLOCO/base
    // da etapa seguinte (ex.: stage 11 sem correct_option mas "letra A" no 12).
    let resolvedCorrect = q.correct_option ?? null
    if (!resolvedCorrect) {
      const hasOptions = Boolean(
        resolveExerciseOptions(questionRaw.options, qContent),
      )
      if (hasOptions) {
        if (nextQSnap.exists) {
          const nextData = (nextQSnap.data() ?? {}) as Record<string, unknown>
          const nextContent =
            typeof nextData.content === 'string' ? nextData.content : ''
          const letter = extractCorrectLetterFromText(nextContent)
          if (letter) resolvedCorrect = letter
        }
        if (!resolvedCorrect && typeof data.feedback === 'string') {
          const letter = extractCorrectLetterFromText(data.feedback)
          if (letter) resolvedCorrect = letter
        }
      }
    }

    // Sem gabarito: registra tentativa unscored (não 500).
    const correct_option = resolvedCorrect ?? ''
    const hasGabarito = Boolean(resolvedCorrect)
    const is_correct = hasGabarito
      ? answersMatch(studentAnswer, resolvedCorrect as string)
      : false
    const score = hasGabarito ? (is_correct ? 1 : 0) : null

    const doc: Record<string, unknown> = {
      student_id: data.student_id,
      institution_id: data.institution_id,
      trail_id: data.trail_id,
      stage_number: data.stage_number,
      question_number: data.question_number,
      student_answer: studentAnswer,
      correct_option,
      is_correct,
      score,
      feedback: data.feedback ?? null,
      attempt_number,
      attempted_at: now,
      created_at: now,
      updated_at: now,
      ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
    }

    const ref = attemptsRef.doc()
    tx.set(ref, doc)
    tx.set(lockRef, {
      student_id: data.student_id,
      trail_id: data.trail_id,
      stage_number: data.stage_number,
      question_number: data.question_number,
      attempt_id: ref.id,
      idempotency_key: idempotencyKey,
      locked_at_ms: Date.now(),
      updated_at: now,
    })

    return {
      id: ref.id,
      is_correct,
      attempt_number,
      score,
      feedback: data.feedback ?? null,
      replay: false,
    }
  })

  return result
}
