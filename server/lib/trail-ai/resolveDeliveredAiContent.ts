import type { Firestore } from 'firebase-admin/firestore'

import { conversationLogCreatedAtMillis } from '../conversationLogService'

function conversationLogsCollection(): string {
  return process.env.CONVERSATION_LOGS_COLLECTION ?? 'conversation_logs'
}

export type DeliveredAiContent = {
  message_text: string
  log_id: string
}

/**
 * Texto já entregue para a célula (stage, question):
 * último conversation_logs sender=system nessa posição.
 *
 * Query: student_id + trail_id; filtra e ordena em memória
 * (evita índice composto novo).
 */
export async function resolveDeliveredAiContent(
  db: Firestore,
  input: {
    student_id: string
    trail_id: string
    stage_number: number
    question_number: number
  },
): Promise<DeliveredAiContent | null> {
  const studentId = input.student_id.trim()
  const trailId = input.trail_id.trim()
  if (!studentId || !trailId) return null
  if (input.stage_number < 1 || input.question_number < 1) return null

  const snap = await db
    .collection(conversationLogsCollection())
    .where('student_id', '==', studentId)
    .where('trail_id', '==', trailId)
    .get()

  let best: { rank: number; message_text: string; log_id: string } | null = null
  for (const doc of snap.docs) {
    const data = (doc.data() ?? {}) as Record<string, unknown>
    if (data.sender !== 'system') continue
    if (data.stage_number !== input.stage_number) continue
    if (data.question_number !== input.question_number) continue
    const text =
      typeof data.message_text === 'string' ? data.message_text.trim() : ''
    if (!text) continue
    const rank = conversationLogCreatedAtMillis(data)
    if (!best || rank >= best.rank) {
      best = { rank, message_text: text, log_id: doc.id }
    }
  }
  return best
    ? { message_text: best.message_text, log_id: best.log_id }
    : null
}

/**
 * CONTEXT recente: query student_id+trail_id; sort desc + slice em memória.
 */
export async function listRecentContextLogs(
  db: Firestore,
  input: { student_id: string; trail_id: string; limit: number },
): Promise<
  Array<{
    sender: string
    message_text: string
    stage_number?: number
    question_number?: number
  }>
> {
  const studentId = input.student_id.trim()
  const trailId = input.trail_id.trim()
  const limit = Math.max(1, Math.min(50, input.limit))
  if (!studentId || !trailId) return []

  const snap = await db
    .collection(conversationLogsCollection())
    .where('student_id', '==', studentId)
    .where('trail_id', '==', trailId)
    .get()

  const ranked = snap.docs
    .map((doc) => {
      const data = (doc.data() ?? {}) as Record<string, unknown>
      return {
        rank: conversationLogCreatedAtMillis(data),
        sender: typeof data.sender === 'string' ? data.sender : 'system',
        message_text:
          typeof data.message_text === 'string' ? data.message_text : '',
        stage_number:
          typeof data.stage_number === 'number' ? data.stage_number : undefined,
        question_number:
          typeof data.question_number === 'number'
            ? data.question_number
            : undefined,
      }
    })
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit)

  return ranked
    .reverse()
    .map(({ sender, message_text, stage_number, question_number }) => ({
      sender,
      message_text,
      stage_number,
      question_number,
    }))
}

/** Lista completa student+trail ordenada ASC (sem orderBy Firestore). */
export async function listTrailConversationLogsSafe(
  db: Firestore,
  studentId: string,
  trailId: string,
): Promise<
  Array<{
    id: string
    student_id: string
    trail_id: string
    stage_number: number
    question_number: number
    sender: string
    message_text: string
    institution_id: string | null
    message_type: string | null
    metadata: Record<string, unknown> | null
    created_at_brasilia: string | null
    created_at_ms: number
  }>
> {
  const sid = studentId.trim()
  const tid = trailId.trim()
  if (!sid || !tid) return []

  const snap = await db
    .collection(conversationLogsCollection())
    .where('student_id', '==', sid)
    .where('trail_id', '==', tid)
    .get()

  return snap.docs
    .map((doc) => {
      const data = (doc.data() ?? {}) as Record<string, unknown>
      return {
        id: doc.id,
        student_id: typeof data.student_id === 'string' ? data.student_id : sid,
        trail_id: typeof data.trail_id === 'string' ? data.trail_id : tid,
        stage_number:
          typeof data.stage_number === 'number' ? data.stage_number : 0,
        question_number:
          typeof data.question_number === 'number' ? data.question_number : 0,
        sender: typeof data.sender === 'string' ? data.sender : 'system',
        message_text:
          typeof data.message_text === 'string' ? data.message_text : '',
        institution_id:
          typeof data.institution_id === 'string' ? data.institution_id : null,
        message_type:
          typeof data.message_type === 'string' ? data.message_type : null,
        metadata:
          data.metadata &&
          typeof data.metadata === 'object' &&
          !Array.isArray(data.metadata)
            ? (data.metadata as Record<string, unknown>)
            : null,
        created_at_brasilia:
          typeof data.created_at_brasilia === 'string'
            ? data.created_at_brasilia
            : null,
        created_at_ms: conversationLogCreatedAtMillis(data),
      }
    })
    .sort((a, b) => a.created_at_ms - b.created_at_ms)
}
