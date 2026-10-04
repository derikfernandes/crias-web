import type { Firestore } from 'firebase-admin/firestore'

import { conversationLogCreatedAtMillis } from '../conversationLogService'
import type { CollectionNames } from '../trail-engine/types'
import { defaultCollectionNames } from '../trail-engine/types'

export type DeliveredAiContent = {
  message_text: string
  log_id: string
}

/**
 * Texto já entregue (WA ou app) para a célula (stage, question):
 * último conversation_logs sender=system nessa posição.
 *
 * Query Firestore: só student_id + trail_id (composite Enabled há tempo).
 * Filtra stage_number / question_number / sender e ordena created_at em memória
 * — sem índice composto novo (P0 Continuar / FAILED_PRECONDITION).
 */
export async function resolveDeliveredAiContent(
  db: Firestore,
  input: {
    student_id: string
    trail_id: string
    stage_number: number
    question_number: number
  },
  collections: CollectionNames = defaultCollectionNames(),
): Promise<DeliveredAiContent | null> {
  const studentId = input.student_id.trim()
  const trailId = input.trail_id.trim()
  if (!studentId || !trailId) return null
  if (input.stage_number < 1 || input.question_number < 1) return null

  const snap = await db
    .collection(collections.conversationLogs)
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
 * Evita orderBy created_at no Firestore (índice student_id+trail_id+created_at
 * pode não estar Enabled no projeto).
 */
export async function listRecentContextLogs(
  db: Firestore,
  input: { student_id: string; trail_id: string; limit: number },
  collections: CollectionNames = defaultCollectionNames(),
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
    .collection(collections.conversationLogs)
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

  // API interna desc; CONTEXT deve ir do mais antigo ao mais recente.
  return ranked.reverse().map(({ sender, message_text, stage_number, question_number }) => ({
    sender,
    message_text,
    stage_number,
    question_number,
  }))
}
