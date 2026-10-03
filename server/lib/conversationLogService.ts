import type {
  DocumentSnapshot,
  Firestore,
  QuerySnapshot,
} from 'firebase-admin/firestore'
import { FieldValue } from 'firebase-admin/firestore'

import type {
  ConversationLogCreatePayload,
  ConversationLogSender,
  ConversationLogMessageType,
} from './conversationLogValidation'
import { formatDateTimeBrasilia } from './brasiliaDateTime'

/** Epoch ms for sorting without Firestore orderBy (índice composto). */
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
      /* ignore */
    }
  }
  if (
    created &&
    typeof created === 'object' &&
    'seconds' in created &&
    typeof (created as { seconds?: unknown }).seconds === 'number'
  ) {
    return ((created as { seconds: number }).seconds || 0) * 1000
  }
  return 0
}

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

export async function listConversationLogsByStudent(
  db: Firestore,
  collectionName: string,
  studentId: string,
): Promise<QuerySnapshot> {
  return db
    .collection(collectionName)
    .where('student_id', '==', studentId)
    .orderBy('created_at', 'asc')
    .get()
}

export async function listConversationLogsByStudentAndTrail(
  db: Firestore,
  collectionName: string,
  studentId: string,
  trailId: string,
): Promise<QuerySnapshot> {
  return db
    .collection(collectionName)
    .where('student_id', '==', studentId)
    .where('trail_id', '==', trailId)
    .orderBy('created_at', 'asc')
    .get()
}

export async function listConversationLogsByStudentTrailAndStage(
  db: Firestore,
  collectionName: string,
  studentId: string,
  trailId: string,
  stageNumber: number,
): Promise<QuerySnapshot> {
  return db
    .collection(collectionName)
    .where('student_id', '==', studentId)
    .where('trail_id', '==', trailId)
    .where('stage_number', '==', stageNumber)
    .orderBy('created_at', 'asc')
    .get()
}

export async function listRecentConversationLogs(
  db: Firestore,
  collectionName: string,
  studentId: string,
  trailId: string | null,
  limit: number,
): Promise<QuerySnapshot> {
  let query = db
    .collection(collectionName)
    .where('student_id', '==', studentId)
    .orderBy('created_at', 'desc')
    .limit(limit)

  if (trailId) {
    query = query.where('trail_id', '==', trailId)
  }

  return query.get()
}
