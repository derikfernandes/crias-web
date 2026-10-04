import type { Firestore } from 'firebase-admin/firestore'
import { FieldValue } from 'firebase-admin/firestore'

import { formatDateTimeBrasilia } from '../brasiliaDateTime'
import { TrailEngineError } from './errors'
import type { CollectionNames, TrailChannel } from './types'
import { defaultCollectionNames } from './types'

export type RecordMessageInput = {
  student_id: string
  trail_id: string
  stage_number: number
  question_number: number
  sender: 'system' | 'student'
  message_text: string
  channel: TrailChannel
  idempotency_key?: string
  institution_id?: string | null
  message_type?: 'text' | 'instruction' | 'exercise' | 'feedback' | null
  metadata?: Record<string, unknown> | null
  kind?: 'delivery' | 'student_message'
}

export type RecordMessageResult = {
  id: string
  created_at_brasilia: string
  deduped: boolean
}

/**
 * Append em conversation_logs com channel + dedupe opcional por idempotency_key.
 */
export async function recordMessage(
  db: Firestore,
  input: RecordMessageInput,
  collections: CollectionNames = defaultCollectionNames(),
): Promise<RecordMessageResult> {
  const studentId = input.student_id.trim()
  const trailId = input.trail_id.trim()
  const text = input.message_text?.trim() ?? ''

  if (!studentId || !trailId) {
    throw new TrailEngineError(
      'invalid_payload',
      'student_id e trail_id são obrigatórios.',
    )
  }
  if (!text) {
    throw new TrailEngineError('invalid_payload', 'message_text é obrigatório.')
  }
  if (input.stage_number < 1 || input.question_number < 1) {
    throw new TrailEngineError(
      'invalid_payload',
      'stage_number e question_number devem ser >= 1.',
    )
  }

  const key = input.idempotency_key?.trim()
  if (key) {
    const idemId = `log_${studentId}_${trailId}_${key}`
    const idemRef = db.collection(collections.idempotencyKeys).doc(idemId)
    const existing = await idemRef.get()
    if (existing.exists) {
      const data = (existing.data() ?? {}) as Record<string, unknown>
      const logId = typeof data.log_id === 'string' ? data.log_id : null
      const created =
        typeof data.created_at_brasilia === 'string'
          ? data.created_at_brasilia
          : ''
      if (logId) {
        return { id: logId, created_at_brasilia: created, deduped: true }
      }
    }
  }

  const ref = db.collection(collections.conversationLogs).doc()
  const now = FieldValue.serverTimestamp()
  const created_at_brasilia = formatDateTimeBrasilia()

  const metadata: Record<string, unknown> = {
    ...(input.metadata && typeof input.metadata === 'object'
      ? input.metadata
      : {}),
    channel: input.channel,
    kind: input.kind ?? (input.sender === 'system' ? 'delivery' : 'student_message'),
  }
  if (key) metadata.idempotency_key = key

  await ref.set({
    student_id: studentId,
    trail_id: trailId,
    stage_number: input.stage_number,
    question_number: input.question_number,
    sender: input.sender,
    message_text: text,
    institution_id: input.institution_id ?? null,
    message_type: input.message_type ?? null,
    channel: input.channel,
    metadata,
    created_at: now,
    created_at_brasilia,
  })

  if (key) {
    const idemId = `log_${studentId}_${trailId}_${key}`
    await db
      .collection(collections.idempotencyKeys)
      .doc(idemId)
      .set(
        {
          log_id: ref.id,
          created_at_brasilia,
          created_at: now,
          student_id: studentId,
          trail_id: trailId,
          idempotency_key: key,
        },
        { merge: true },
      )
  }

  return { id: ref.id, created_at_brasilia, deduped: false }
}

export async function recordDelivery(
  db: Firestore,
  input: Omit<RecordMessageInput, 'sender' | 'kind'> & {
    sender?: 'system'
  },
  collections?: CollectionNames,
): Promise<RecordMessageResult> {
  return recordMessage(
    db,
    {
      ...input,
      sender: 'system',
      kind: 'delivery',
    },
    collections,
  )
}

export async function recordStudentMessage(
  db: Firestore,
  input: Omit<RecordMessageInput, 'sender' | 'kind'> & {
    sender?: 'student'
  },
  collections?: CollectionNames,
): Promise<RecordMessageResult> {
  return recordMessage(
    db,
    {
      ...input,
      sender: 'student',
      kind: 'student_message',
    },
    collections,
  )
}
