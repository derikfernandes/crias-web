import type { Firestore } from 'firebase-admin/firestore'

import { conversationLogCreatedAtMillis } from '../conversationLogService'
import { requireEnrollment } from './enrollment'
import { TrailEngineError } from './errors'
import type { CollectionNames } from './types'
import { defaultCollectionNames } from './types'

export type TrailConversationMessage = {
  id: string
  student_id: string
  trail_id: string
  stage_number: number
  question_number: number
  sender: 'system' | 'student'
  message_text: string
  message_type: 'text' | 'instruction' | 'exercise' | 'feedback' | null
  institution_id: string | null
  created_at: string | null
  created_at_brasilia: string | null
  metadata: Record<string, unknown> | null
}

export type TrailConversationResult = {
  status: 'ok'
  student_id: string
  trail_id: string
  current_stage_number: number
  current_question_number: number
  progress_status: string
  messages: TrailConversationMessage[]
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

function parseMessageType(
  raw: unknown,
): TrailConversationMessage['message_type'] {
  if (
    raw === 'text' ||
    raw === 'instruction' ||
    raw === 'exercise' ||
    raw === 'feedback'
  ) {
    return raw
  }
  return null
}

/**
 * Histórico de conversa (conversation_logs) da matrícula — ordem cronológica.
 * AuthZ fica na fachada HTTP (aluno só a própria trilha).
 */
export async function getTrailConversation(
  db: Firestore,
  input: { student_id: string; trail_id: string },
  collections: CollectionNames = defaultCollectionNames(),
): Promise<TrailConversationResult> {
  const studentId = input.student_id.trim()
  const trailId = input.trail_id.trim()
  if (!studentId || !trailId) {
    throw new TrailEngineError(
      'invalid_payload',
      'student_id e trail_id são obrigatórios.',
    )
  }

  const progress = await requireEnrollment(db, studentId, trailId, collections)

  const snap = await db
    .collection(collections.conversationLogs)
    .where('student_id', '==', studentId)
    .where('trail_id', '==', trailId)
    .get()

  const ranked = snap.docs
    .map((doc) => {
      const data = (doc.data() ?? {}) as Record<string, unknown>
      return { doc, data, rank: conversationLogCreatedAtMillis(data) }
    })
    .sort((a, b) => a.rank - b.rank)

  const messages: TrailConversationMessage[] = ranked.map(({ doc, data }) => {
    const sender =
      data.sender === 'student' || data.sender === 'system'
        ? data.sender
        : 'system'
    const meta =
      data.metadata && typeof data.metadata === 'object'
        ? (data.metadata as Record<string, unknown>)
        : null
    return {
      id: doc.id,
      student_id: studentId,
      trail_id: trailId,
      stage_number:
        typeof data.stage_number === 'number' && Number.isFinite(data.stage_number)
          ? data.stage_number
          : 0,
      question_number:
        typeof data.question_number === 'number' &&
        Number.isFinite(data.question_number)
          ? data.question_number
          : 0,
      sender,
      message_text:
        typeof data.message_text === 'string' ? data.message_text : '',
      message_type: parseMessageType(data.message_type),
      institution_id:
        typeof data.institution_id === 'string' ? data.institution_id : null,
      created_at: serializeTs(data.created_at),
      created_at_brasilia:
        typeof data.created_at_brasilia === 'string'
          ? data.created_at_brasilia
          : null,
      metadata: meta,
    }
  })

  return {
    status: 'ok',
    student_id: studentId,
    trail_id: trailId,
    current_stage_number: progress.current_stage_number,
    current_question_number: progress.current_question_number,
    progress_status: progress.status,
    messages,
  }
}
