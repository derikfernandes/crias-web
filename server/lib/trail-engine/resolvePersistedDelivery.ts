import type { Firestore } from 'firebase-admin/firestore'

import { conversationLogCreatedAtMillis } from '../conversationLogService'
import type { CollectionNames } from './types'
import { defaultCollectionNames } from './types'

function pickLatestDeliveryMessage(
  docs: Array<{ data: () => Record<string, unknown> | undefined }>,
): string | null {
  let best: { rank: number; text: string } | null = null
  for (const doc of docs) {
    const data = doc.data() ?? {}
    if (data.sender !== 'system') continue
    const text =
      typeof data.message_text === 'string' ? data.message_text.trim() : ''
    if (!text) continue
    const meta =
      data.metadata && typeof data.metadata === 'object'
        ? (data.metadata as Record<string, unknown>)
        : null
    const kind = meta?.kind ?? data.kind
    if (kind != null && kind !== 'delivery') continue

    const rank = conversationLogCreatedAtMillis(data)
    if (!best || rank >= best.rank) {
      best = { rank, text }
    }
  }
  return best?.text ?? null
}

/**
 * Última entrega persistida (WhatsApp / motor) para a célula atual.
 * SoT do texto mostrado ao aluno quando existe log — paridade com variável CONTENT / IA_ANSWER.
 *
 * Query: só student_id + trail_id. Filtra stage/question/sender em memória
 * (sem índice composto novo).
 */
export async function resolvePersistedDeliveryText(
  db: Firestore,
  input: {
    student_id: string
    trail_id: string
    stage_number: number
    question_number: number
  },
  collections: CollectionNames = defaultCollectionNames(),
): Promise<string | null> {
  const studentId = input.student_id.trim()
  const trailId = input.trail_id.trim()
  if (!studentId || !trailId) return null

  const snap = await db
    .collection(collections.conversationLogs)
    .where('student_id', '==', studentId)
    .where('trail_id', '==', trailId)
    .get()

  const matching = snap.docs.filter((doc) => {
    const data = (doc.data() ?? {}) as Record<string, unknown>
    return (
      data.stage_number === input.stage_number &&
      data.question_number === input.question_number &&
      data.sender === 'system'
    )
  })

  if (matching.length === 0) return null
  return pickLatestDeliveryMessage(matching)
}

export type ResolvedStepBody = {
  /** Texto a exibir no player (curriculum ou entrega persistida). */
  body: string | null
  /** Origem do `body` exposto em `content` na resposta next-content. */
  source: 'persisted_delivery' | 'curriculum' | 'none'
}

/**
 * Compõe corpo exibível: preferência à entrega persistida; evita template cru em IA sem log.
 */
export function resolveStepDisplayBody(input: {
  stage_type: 'ai' | 'fixed' | 'exercise' | null
  curriculum_content: string | null
  persisted_delivery: string | null
}): ResolvedStepBody {
  const persisted = input.persisted_delivery?.trim() || null
  if (persisted) {
    return { body: persisted, source: 'persisted_delivery' }
  }
  const curriculum = input.curriculum_content?.trim() || null
  if (input.stage_type === 'ai') {
    return { body: null, source: 'none' }
  }
  if (curriculum) {
    return { body: curriculum, source: 'curriculum' }
  }
  return { body: null, source: 'none' }
}
