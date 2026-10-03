import type { Firestore } from 'firebase-admin/firestore'

import { conversationLogCreatedAtMillis } from '../conversationLogService'

function conversationLogsCollection(): string {
  return process.env.CONVERSATION_LOGS_COLLECTION ?? 'conversation_logs'
}

export type DeliveredAiContent = {
  message_text: string
  log_id: string
}

function asPositiveInt(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v) && v >= 1) {
    return Math.trunc(v)
  }
  if (typeof v === 'string' && /^\d+$/.test(v.trim())) {
    const n = Number.parseInt(v.trim(), 10)
    return n >= 1 ? n : null
  }
  return null
}

function isTrailAiDelivery(data: Record<string, unknown>): boolean {
  const meta = data.metadata
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    const source = (meta as Record<string, unknown>).source
    if (source === 'trail-ai') return true
    // Maria / feedback / next-content do cliente não contam como delivery da trilha.
    if (
      source === 'maria-tutor' ||
      source === 'exercise_feedback' ||
      source === 'next-content' ||
      source === 'continuar'
    ) {
      return false
    }
  }
  // Fallback legado: instruction sem metadata Maria.
  return data.message_type === 'instruction' && data.sender === 'system'
}

/**
 * Texto já entregue para a célula (stage, question) pela geração da trilha:
 * conversation_logs com metadata.source=trail-ai (ou instruction legado).
 *
 * Ignora respostas da Maria e feedback de exercício na mesma célula —
 * senão o cache “furava” e/ou re-gerava Gemini a cada Continuar.
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
    if (!isTrailAiDelivery(data)) continue
    const stage = asPositiveInt(data.stage_number)
    const question = asPositiveInt(data.question_number)
    if (stage !== input.stage_number) continue
    if (question !== input.question_number) continue
    const text =
      typeof data.message_text === 'string' ? data.message_text.trim() : ''
    if (!text) continue
    const rank = conversationLogCreatedAtMillis(data)
    // Prefere a entrega mais antiga (primeiro generate da célula).
    if (!best || rank < best.rank) {
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
          asPositiveInt(data.stage_number) ?? undefined,
        question_number:
          asPositiveInt(data.question_number) ?? undefined,
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
        stage_number: asPositiveInt(data.stage_number) ?? 0,
        question_number: asPositiveInt(data.question_number) ?? 0,
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
