import type {
  DocumentSnapshot,
  Firestore,
  QueryDocumentSnapshot,
  QuerySnapshot,
} from 'firebase-admin/firestore'
import { FieldValue } from 'firebase-admin/firestore'

import type {
  ConversationLogCreatePayload,
  ConversationLogSender,
  ConversationLogMessageType,
} from './conversationLogValidation'
import { formatDateTimeBrasilia } from './brasiliaDateTime'

export type ConversationLogRuntime = {
  id: string
  student_id: string
  trail_id: string
  stage_number: number
  question_number: number
  sender: ConversationLogSender
  message_text: string
  institution_id: string | null
  message_type: ConversationLogMessageType | null
  metadata: Record<string, unknown> | null
  created_at: unknown
}

/** Shape mínimo usado pelos callers (API) — evita fabricar QuerySnapshot. */
export type ConversationLogListResult = {
  docs: QueryDocumentSnapshot[]
  empty: boolean
  size: number
}

/**
 * Rank temporal para ordenação em memória.
 * Preferimos created_at_brasilia; fallback created_at (Timestamp).
 */
export function conversationLogCreatedAtMillis(
  data: Record<string, unknown>,
): number {
  const brasilia =
    typeof data.created_at_brasilia === 'string' ? data.created_at_brasilia : ''
  if (brasilia) {
    const parsed = Date.parse(brasilia.replace(' ', 'T'))
    if (Number.isFinite(parsed)) return parsed
  }
  const created = data.created_at
  if (
    created &&
    typeof created === 'object' &&
    'toDate' in created &&
    typeof (created as { toDate?: unknown }).toDate === 'function'
  ) {
    try {
      return (created as { toDate: () => Date }).toDate().getTime()
    } catch {
      return 0
    }
  }
  if (typeof created === 'number' && Number.isFinite(created)) return created
  return 0
}

function sortByCreatedAtAsc(
  docs: QueryDocumentSnapshot[],
): QueryDocumentSnapshot[] {
  return [...docs].sort((a, b) => {
    const da = (a.data() ?? {}) as Record<string, unknown>
    const db = (b.data() ?? {}) as Record<string, unknown>
    return conversationLogCreatedAtMillis(da) - conversationLogCreatedAtMillis(db)
  })
}

function sortByCreatedAtDesc(
  docs: QueryDocumentSnapshot[],
): QueryDocumentSnapshot[] {
  return sortByCreatedAtAsc(docs).reverse()
}

function asListResult(docs: QueryDocumentSnapshot[]): ConversationLogListResult {
  return { docs, empty: docs.length === 0, size: docs.length }
}

/**
 * Tradeoff (sem índice composto novo):
 * Queries usam só equality em student_id (+ trail_id quando há índice
 * student_id+trail_id já Enabled há tempo). stage_number / orderBy / limit
 * rodam em memória no Node. Por enrollment (aluno+trilha) o volume costuma
 * ser centenas de docs; se crescer para dezenas de milhares, o custo de
 * leitura sobe — aí sim vale índice composto deployed (fora do escopo P0).
 */
const IN_MEMORY_SOFT_CAP = 5_000

function applySoftCap(
  docs: QueryDocumentSnapshot[],
  preferNewest: boolean,
): QueryDocumentSnapshot[] {
  if (docs.length <= IN_MEMORY_SOFT_CAP) return docs
  const sorted = preferNewest
    ? sortByCreatedAtDesc(docs)
    : sortByCreatedAtAsc(docs)
  return sorted.slice(0, IN_MEMORY_SOFT_CAP)
}

export async function createConversationLog(
  db: Firestore,
  collectionName: string,
  data: ConversationLogCreatePayload,
): Promise<{ id: string; created_at_brasilia: string }> {
  const ref = db.collection(collectionName).doc()
  const now = FieldValue.serverTimestamp()
  const created_at_brasilia = formatDateTimeBrasilia()

  const doc: Record<string, unknown> = {
    student_id: data.student_id,
    trail_id: data.trail_id,
    stage_number: data.stage_number,
    question_number: data.question_number,
    sender: data.sender,
    message_text: data.message_text,
    institution_id: data.institution_id ?? null,
    message_type: data.message_type ?? null,
    metadata: data.metadata ?? null,
    created_at: now,
    created_at_brasilia,
  }

  await ref.set(doc)

  return { id: ref.id, created_at_brasilia }
}

export async function getConversationLogById(
  db: Firestore,
  collectionName: string,
  id: string,
): Promise<DocumentSnapshot> {
  return db.collection(collectionName).doc(id).get()
}

/** Só student_id (single-field). Ordena created_at em memória. */
export async function listConversationLogsByStudent(
  db: Firestore,
  collectionName: string,
  studentId: string,
): Promise<ConversationLogListResult> {
  const snap: QuerySnapshot = await db
    .collection(collectionName)
    .where('student_id', '==', studentId)
    .get()
  return asListResult(sortByCreatedAtAsc(applySoftCap(snap.docs, false)))
}

/**
 * Equality student_id + trail_id (composite já Enabled há tempo).
 * Sem orderBy no Firestore — ordena created_at em memória.
 */
export async function listConversationLogsByStudentAndTrail(
  db: Firestore,
  collectionName: string,
  studentId: string,
  trailId: string,
): Promise<ConversationLogListResult> {
  const snap: QuerySnapshot = await db
    .collection(collectionName)
    .where('student_id', '==', studentId)
    .where('trail_id', '==', trailId)
    .get()
  return asListResult(sortByCreatedAtAsc(applySoftCap(snap.docs, false)))
}

/**
 * Mesma query base student_id+trail_id; stage_number filtrado em memória
 * (evita índice stage_number+student_id+trail_id+created_at).
 */
export async function listConversationLogsByStudentTrailAndStage(
  db: Firestore,
  collectionName: string,
  studentId: string,
  trailId: string,
  stageNumber: number,
): Promise<ConversationLogListResult> {
  const snap: QuerySnapshot = await db
    .collection(collectionName)
    .where('student_id', '==', studentId)
    .where('trail_id', '==', trailId)
    .get()
  const filtered = snap.docs.filter((doc) => {
    const data = (doc.data() ?? {}) as Record<string, unknown>
    return data.stage_number === stageNumber
  })
  return asListResult(sortByCreatedAtAsc(applySoftCap(filtered, false)))
}

/**
 * student_id (+ trail_id em equality se informado). Sort desc + limit em memória.
 */
export async function listRecentConversationLogs(
  db: Firestore,
  collectionName: string,
  studentId: string,
  trailId: string | null,
  limit: number,
): Promise<ConversationLogListResult> {
  const capped = Math.max(1, Math.min(200, limit))
  let snap: QuerySnapshot
  if (trailId) {
    snap = await db
      .collection(collectionName)
      .where('student_id', '==', studentId)
      .where('trail_id', '==', trailId)
      .get()
  } else {
    snap = await db
      .collection(collectionName)
      .where('student_id', '==', studentId)
      .get()
  }
  const sorted = sortByCreatedAtDesc(applySoftCap(snap.docs, true))
  return asListResult(sorted.slice(0, capped))
}
