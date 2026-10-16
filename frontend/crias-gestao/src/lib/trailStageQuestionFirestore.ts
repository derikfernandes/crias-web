import {
  doc,
  runTransaction,
  serverTimestamp,
  updateDoc,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from './firebase'
import type {
  TrailStageQuestion,
  TrailStageQuestionOption,
} from '../types/trailStageQuestion'

export const TRAIL_STAGE_QUESTIONS_COLLECTION = 'trail_stage_questions'

function readOptions(raw: unknown): TrailStageQuestionOption[] | null {
  if (!Array.isArray(raw)) return null
  const out: TrailStageQuestionOption[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    if (typeof o.key !== 'string' || typeof o.text !== 'string') continue
    out.push({ key: o.key, text: o.text })
  }
  return out.length ? out : null
}

export function trailStageQuestionDocId(
  trailId: string,
  stageNumber: number,
  questionNumber: number,
): string {
  return `${trailId}_stage_${stageNumber}_q_${questionNumber}`
}

export function snapshotToTrailStageQuestion(
  d: DocumentSnapshot | QueryDocumentSnapshot,
): TrailStageQuestion {
  const data = d.data()
  if (!data) {
    return {
      id: d.id,
      trail_id: '',
      stage_number: 1,
      question_number: 1,
      title: '',
      content: '',
      correct_option: null,
      options: null,
      explanation: null,
      annulled: false,
      annulled_at: null,
      annulled_reason: null,
      is_released: false,
      active: false,
      created_at: null,
      updated_at: null,
    }
  }

  return {
    id: d.id,
    trail_id: typeof data.trail_id === 'string' ? data.trail_id : '',
    stage_number:
      typeof data.stage_number === 'number' && Number.isFinite(data.stage_number)
        ? data.stage_number
        : 1,
    question_number:
      typeof data.question_number === 'number' &&
      Number.isFinite(data.question_number)
        ? data.question_number
        : 1,
    title: typeof data.title === 'string' ? data.title : '',
    content: typeof data.content === 'string' ? data.content : '',
    correct_option:
      typeof data.correct_option === 'string' ? data.correct_option : null,
    options: readOptions(data.options),
    explanation:
      typeof data.explanation === 'string'
        ? data.explanation
        : data.explanation === null
          ? null
          : null,
    annulled: data.annulled === true,
    annulled_at: data.annulled_at ?? null,
    annulled_reason:
      typeof data.annulled_reason === 'string' ? data.annulled_reason : null,
    is_released:
      typeof data.is_released === 'boolean'
        ? data.is_released
        : typeof data.question_number === 'number' &&
            Number.isFinite(data.question_number) &&
            data.question_number === 1,
    active: typeof data.active === 'boolean' ? data.active : false,
    created_at: data.created_at ?? null,
    updated_at: data.updated_at ?? null,
  }
}

export function formatTrailStageQuestionTs(
  value: TrailStageQuestion['created_at'],
): string {
  if (!value || typeof value.toDate !== 'function') return '—'
  try {
    return value.toDate().toLocaleString('pt-BR')
  } catch {
    return '—'
  }
}

// ---------------------------------------------------------------------------
// Wrappers de escrita usados pelos componentes visuais. A lógica foi extraída
// de TrailStageQuestionForm sem nenhuma alteração de comportamento: mesma
// coleção, mesmos campos e mesmos payloads.
// ---------------------------------------------------------------------------

export type TrailStageQuestionUpdateData = {
  title: string
  content: string
  explanation: string | null
  correct_option: string | null
  options: TrailStageQuestionOption[] | null
  is_released: boolean
  active: boolean
}

export async function updateTrailStageQuestion(
  docId: string,
  data: TrailStageQuestionUpdateData,
): Promise<void> {
  if (!db) throw new Error('Firebase não inicializado.')
  await updateDoc(doc(db, TRAIL_STAGE_QUESTIONS_COLLECTION, docId), {
    title: data.title,
    content: data.content,
    explanation: data.explanation,
    correct_option: data.correct_option,
    options: data.options,
    is_released: data.is_released,
    active: data.active,
    updated_at: serverTimestamp(),
  })
}

export type TrailStageQuestionCreateData = {
  trail_id: string
  stage_number: number
  question_number: number
  title: string
  content: string
  correct_option: string | null
  options: TrailStageQuestionOption[] | null
  explanation: string | null
  is_released: boolean
}

/**
 * Cria a questão em transação, falhando se já existir question_number igual
 * no mesmo stage (mesmo doc id determinístico usado pelo formulário).
 */
export async function createTrailStageQuestion(
  data: TrailStageQuestionCreateData,
): Promise<void> {
  if (!db) throw new Error('Firebase não inicializado.')
  const dbOk = db
  const newDocId = trailStageQuestionDocId(
    data.trail_id,
    data.stage_number,
    data.question_number,
  )
  const now = serverTimestamp()

  await runTransaction(dbOk, async (tx) => {
    const ref = doc(dbOk, TRAIL_STAGE_QUESTIONS_COLLECTION, newDocId)
    const existing = await tx.get(ref)
    if (existing.exists()) {
      throw new Error(
        `Já existe question_number ${data.question_number} neste stage (trail "${data.trail_id}", stage ${data.stage_number}).`,
      )
    }
    tx.set(ref, {
      trail_id: data.trail_id,
      stage_number: data.stage_number,
      question_number: data.question_number,
      title: data.title,
      content: data.content,
      correct_option: data.correct_option,
      options: data.options,
      explanation: data.explanation,
      annulled: false,
      annulled_at: null,
      annulled_reason: null,
      is_released: data.is_released,
      active: true,
      created_at: now,
      updated_at: now,
    })
  })
}
