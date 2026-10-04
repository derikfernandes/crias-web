import type { Firestore } from 'firebase-admin/firestore'

import { conversationLogCreatedAtMillis } from '../conversationLogService'

function conversationLogsCollection(): string {
  return process.env.CONVERSATION_LOGS_COLLECTION ?? 'conversation_logs'
}

function trailAiDeliveriesCollection(): string {
  return process.env.TRAIL_AI_DELIVERIES_COLLECTION ?? 'trail_ai_deliveries'
}

/** Doc id estável por célula — lookup O(1) sem varrer conversation_logs. */
export function trailAiDeliveryDocId(
  studentId: string,
  trailId: string,
  stageNumber: number,
  questionNumber: number,
): string {
  return `${studentId}_${trailId}_${stageNumber}_${questionNumber}`
}

export type DeliveredAiContent = {
  message_text: string
  log_id: string
}

const PENDING_STALE_MS = 45_000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Persiste (ou atualiza) o cache O(1) da entrega trail-ai da célula.
 * Idempotente — seguro chamar após generate ou após backfill do log scan.
 */
export async function upsertTrailAiDeliveryCache(
  db: Firestore,
  input: {
    student_id: string
    trail_id: string
    stage_number: number
    question_number: number
    message_text: string
    log_id?: string | null
    /** Fingerprint prompt+content(+exercício) — mismatch força regeneração. */
    content_fingerprint?: string | null
  },
): Promise<void> {
  const studentId = input.student_id.trim()
  const trailId = input.trail_id.trim()
  const text = input.message_text.trim()
  if (!studentId || !trailId || !text) return
  if (input.stage_number < 1 || input.question_number < 1) return

  const id = trailAiDeliveryDocId(
    studentId,
    trailId,
    input.stage_number,
    input.question_number,
  )
  const fp =
    typeof input.content_fingerprint === 'string' &&
    input.content_fingerprint.trim()
      ? input.content_fingerprint.trim()
      : null
  await db
    .collection(trailAiDeliveriesCollection())
    .doc(id)
    .set(
      {
        student_id: studentId,
        trail_id: trailId,
        stage_number: input.stage_number,
        question_number: input.question_number,
        message_text: text,
        log_id: input.log_id ?? null,
        status: 'ready',
        source: 'trail-ai',
        updated_at_ms: Date.now(),
        ...(fp ? { content_fingerprint: fp } : {}),
      },
      { merge: true },
    )
}

/** Lê fingerprint armazenado no cache O(1) da célula (se houver). */
export async function readTrailAiDeliveryFingerprint(
  db: Firestore,
  input: {
    student_id: string
    trail_id: string
    stage_number: number
    question_number: number
  },
): Promise<{ message_text: string; content_fingerprint: string | null } | null> {
  const id = trailAiDeliveryDocId(
    input.student_id.trim(),
    input.trail_id.trim(),
    input.stage_number,
    input.question_number,
  )
  const snap = await db.collection(trailAiDeliveriesCollection()).doc(id).get()
  if (!snap.exists) return null
  const data = (snap.data() ?? {}) as Record<string, unknown>
  const text =
    typeof data.message_text === 'string' ? data.message_text.trim() : ''
  if (!text) return null
  return {
    message_text: text,
    content_fingerprint:
      typeof data.content_fingerprint === 'string'
        ? data.content_fingerprint
        : null,
  }
}

export type TrailAiClaimResult =
  | { kind: 'ready'; content: DeliveredAiContent }
  | { kind: 'claimed' }
  | { kind: 'pending' }

/**
 * Gate atômico create-if-absent em `trail_ai_deliveries/{cell}`:
 * - ready → devolve texto
 * - claimed → este caller pode gerar Gemini
 * - pending → outro caller está gerando
 */
export async function claimTrailAiGeneration(
  db: Firestore,
  input: {
    student_id: string
    trail_id: string
    stage_number: number
    question_number: number
  },
): Promise<TrailAiClaimResult> {
  const studentId = input.student_id.trim()
  const trailId = input.trail_id.trim()
  if (!studentId || !trailId) return { kind: 'pending' }
  if (input.stage_number < 1 || input.question_number < 1) {
    return { kind: 'pending' }
  }

  const ready = await resolveDeliveredAiContent(db, input)
  if (ready) return { kind: 'ready', content: ready }

  const id = trailAiDeliveryDocId(
    studentId,
    trailId,
    input.stage_number,
    input.question_number,
  )
  const ref = db.collection(trailAiDeliveriesCollection()).doc(id)
  const now = Date.now()

  try {
    await ref.create({
      student_id: studentId,
      trail_id: trailId,
      stage_number: input.stage_number,
      question_number: input.question_number,
      status: 'pending',
      source: 'trail-ai',
      claimed_at_ms: now,
      updated_at_ms: now,
      message_text: null,
      log_id: null,
    })
    return { kind: 'claimed' }
  } catch {
    // Doc já existe — ready, pending ou legado.
  }

  const again = await resolveDeliveredAiContent(db, input)
  if (again) return { kind: 'ready', content: again }

  const snap = await ref.get()
  if (!snap.exists) return { kind: 'claimed' }
  const data = (snap.data() ?? {}) as Record<string, unknown>
  const status = typeof data.status === 'string' ? data.status : ''
  const claimedAt =
    typeof data.claimed_at_ms === 'number' ? data.claimed_at_ms : 0
  const text =
    typeof data.message_text === 'string' ? data.message_text.trim() : ''

  if (text && (status === 'ready' || !status)) {
    return {
      kind: 'ready',
      content: {
        message_text: text,
        log_id: typeof data.log_id === 'string' ? data.log_id : id,
      },
    }
  }

  if (status === 'failed' || (status === 'pending' && now - claimedAt > PENDING_STALE_MS)) {
    await ref.set(
      {
        status: 'pending',
        claimed_at_ms: now,
        updated_at_ms: now,
        message_text: null,
        log_id: null,
      },
      { merge: true },
    )
    return { kind: 'claimed' }
  }

  return { kind: 'pending' }
}

/** Espera o doc pending virar ready (ou some). */
export async function waitForTrailAiDelivery(
  db: Firestore,
  input: {
    student_id: string
    trail_id: string
    stage_number: number
    question_number: number
  },
  opts?: { timeoutMs?: number; intervalMs?: number },
): Promise<DeliveredAiContent | null> {
  const timeoutMs = opts?.timeoutMs ?? 12_000
  const intervalMs = opts?.intervalMs ?? 200
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const hit = await resolveDeliveredAiContent(db, input)
    if (hit) return hit
    const id = trailAiDeliveryDocId(
      input.student_id.trim(),
      input.trail_id.trim(),
      input.stage_number,
      input.question_number,
    )
    const snap = await db.collection(trailAiDeliveriesCollection()).doc(id).get()
    if (!snap.exists) return null
    const data = (snap.data() ?? {}) as Record<string, unknown>
    const status = typeof data.status === 'string' ? data.status : ''
    if (status === 'failed') return null
    await sleep(intervalMs)
  }
  return resolveDeliveredAiContent(db, input)
}

/** Libera claim pending em falha de geração (permite retry). */
export async function releaseTrailAiClaim(
  db: Firestore,
  input: {
    student_id: string
    trail_id: string
    stage_number: number
    question_number: number
  },
): Promise<void> {
  const id = trailAiDeliveryDocId(
    input.student_id.trim(),
    input.trail_id.trim(),
    input.stage_number,
    input.question_number,
  )
  const ref = db.collection(trailAiDeliveriesCollection()).doc(id)
  try {
    const snap = await ref.get()
    if (!snap.exists) return
    const data = (snap.data() ?? {}) as Record<string, unknown>
    const text =
      typeof data.message_text === 'string' ? data.message_text.trim() : ''
    if (text || data.status === 'ready') return
    await ref.delete()
  } catch {
    /* best-effort */
  }
}

/**
 * Apaga o cache O(1) da célula (ready ou pending) para forçar regeneração.
 * Usado quando BLOCO RESPOSTA conflita com o attempt ou via force_regenerate.
 */
export async function invalidateTrailAiDelivery(
  db: Firestore,
  input: {
    student_id: string
    trail_id: string
    stage_number: number
    question_number: number
  },
): Promise<boolean> {
  const id = trailAiDeliveryDocId(
    input.student_id.trim(),
    input.trail_id.trim(),
    input.stage_number,
    input.question_number,
  )
  const ref = db.collection(trailAiDeliveriesCollection()).doc(id)
  try {
    const snap = await ref.get()
    if (!snap.exists) return false
    await ref.delete()
    return true
  } catch {
    return false
  }
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
 * Texto já entregue para a célula (stage, question) pela geração da trilha.
 *
 * 1) Cache O(1) em `trail_ai_deliveries` (evita varrer 700+ logs a cada Continuar).
 * 2) Fallback: conversation_logs com metadata.source=trail-ai (ou instruction legado),
 *    com backfill do cache.
 *
 * Ignora respostas da Maria e feedback de exercício na mesma célula.
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

  const cacheId = trailAiDeliveryDocId(
    studentId,
    trailId,
    input.stage_number,
    input.question_number,
  )
  const cacheSnap = await db
    .collection(trailAiDeliveriesCollection())
    .doc(cacheId)
    .get()
  if (cacheSnap.exists) {
    const data = (cacheSnap.data() ?? {}) as Record<string, unknown>
    const status = typeof data.status === 'string' ? data.status : ''
    const text =
      typeof data.message_text === 'string' ? data.message_text.trim() : ''
    // pending/failed sem texto ≠ hit (evita double-generate e falso positivo).
    if (text && (status === 'ready' || status === '' || !status)) {
      return {
        message_text: text,
        log_id: typeof data.log_id === 'string' ? data.log_id : cacheId,
      }
    }
  }

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
    // Prefere a entrega mais recente (force_regenerate / cache alinhado).
    if (!best || rank > best.rank) {
      best = { rank, message_text: text, log_id: doc.id }
    }
  }
  if (!best) return null

  // Backfill cache para próximos Continuar nesta célula.
  void upsertTrailAiDeliveryCache(db, {
    student_id: studentId,
    trail_id: trailId,
    stage_number: input.stage_number,
    question_number: input.question_number,
    message_text: best.message_text,
    log_id: best.log_id,
  }).catch(() => {
    /* cache best-effort */
  })

  return { message_text: best.message_text, log_id: best.log_id }
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
