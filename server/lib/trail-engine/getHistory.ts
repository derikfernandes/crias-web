/**
 * Histórico do player: paginação + higiene (stale ahead-of-position,
 * trail-ai superseded, feedback contraditório / matéria errada).
 */

import type { Firestore } from 'firebase-admin/firestore'

import { alignBlocoWithAttempt } from '../studentTrailProgressService'
import { getStudentTrailPosition } from '../studentTrailService'
import { blocoMismatchesSubject } from '../trail-ai/blocoSubjectGuard'
import {
  listTrailConversationLogsSafe,
  trailAiDeliveryDocId,
} from '../trail-ai/resolveDeliveredAiContent'

function trailAiDeliveriesCollection(): string {
  return process.env.TRAIL_AI_DELIVERIES_COLLECTION ?? 'trail_ai_deliveries'
}

export type HistoryLogRow = Awaited<
  ReturnType<typeof listTrailConversationLogsSafe>
>[number]

export type TrailHistoryPage = {
  logs: HistoryLogRow[]
  has_more: boolean
  next_before: number | null
  total_matching: number
  position: {
    current_stage_number: number
    current_question_number: number
  } | null
}

const FOREIGN_LANG_RE =
  /\b(reg[eê]ncia(\s+verbal)?|preposi[cç][aã]o|verbo\s+gostar|gosta\s+de\s+nadar)\b/i

const INCORRECT_RE = /resposta\s+incorreta/i
const CORRECT_RE = /resposta\s+correta/i
const CELEBRATE_RE =
  /parab[eé]ns|voc[eê]\s+acert|pelo\s+acerto|muito\s+bem/i
const CONCLUDE_RE =
  /parab[eé]ns\s+por\s+concluir|concluiu\s+(esta\s+)?(aula|trilha)|resposta\s+final/i

function metaSource(metadata: Record<string, unknown> | null): string {
  if (!metadata) return ''
  const source = metadata.source
  return typeof source === 'string' ? source : ''
}

function isTrailAiDeliveryLog(row: HistoryLogRow): boolean {
  if (row.sender !== 'system') return false
  const source = metaSource(row.metadata)
  if (
    source === 'maria-tutor' ||
    source === 'exercise_feedback' ||
    source === 'continuar' ||
    source === 'exercise_attempt'
  ) {
    return false
  }
  if (source === 'trail-ai' || source === 'next-content') return true
  return row.message_type === 'instruction'
}

function isExerciseFeedbackLog(row: HistoryLogRow): boolean {
  if (row.sender !== 'system') return false
  if (row.message_type === 'feedback') return true
  return metaSource(row.metadata) === 'exercise_feedback'
}

/** Log está "à frente" da posição atual do aluno (pós-reset / jump). */
export function isAheadOfPosition(
  row: Pick<HistoryLogRow, 'stage_number' | 'question_number'>,
  position: { stage: number; question: number },
): boolean {
  if (row.question_number > position.question) return true
  if (
    row.question_number === position.question &&
    row.stage_number > position.stage
  ) {
    return true
  }
  return false
}

/**
 * Remove celebração de acerto embutida em feedback de attempt errado
 * (e vice-versa). Usado no read path para logs antigos podres.
 */
export function sanitizeContradictoryFeedback(text: string): string {
  const raw = String(text ?? '').trim()
  if (!raw) return raw

  const looksIncorrect = INCORRECT_RE.test(raw)
  const looksCorrect = CORRECT_RE.test(raw) && !looksIncorrect

  if (looksIncorrect && CELEBRATE_RE.test(raw)) {
    return alignBlocoWithAttempt(raw, false)
  }
  if (looksCorrect && /resposta\s+incorreta|voc[eê]\s+errou/i.test(raw)) {
    return alignBlocoWithAttempt(raw, true)
  }
  // Sem label explícito, mas misturou celebração + luto no mesmo blob.
  if (CELEBRATE_RE.test(raw) && INCORRECT_RE.test(raw)) {
    return alignBlocoWithAttempt(raw, false)
  }
  return raw
}

/**
 * Para células trail-ai: mantém só a entrega canônica (cache / texto mais recente
 * sem matéria estrangeira quando existe alternativa boa).
 */
export function pickCanonicalTrailAiLogs(
  logs: HistoryLogRow[],
  canonicalByCell: Map<string, string>,
): Set<string> {
  const keepIds = new Set<string>()
  const byCell = new Map<string, HistoryLogRow[]>()

  for (const row of logs) {
    if (!isTrailAiDeliveryLog(row)) continue
    if (row.stage_number < 1 || row.question_number < 1) continue
    const key = `${row.stage_number}-${row.question_number}`
    const list = byCell.get(key) ?? []
    list.push(row)
    byCell.set(key, list)
  }

  for (const [cell, rows] of byCell) {
    const canonical = canonicalByCell.get(cell)?.trim() || ''
    if (canonical) {
      // Prefer log cujo texto casa com o cache; senão nenhum trail-ai antigo.
      let matched: HistoryLogRow | null = null
      for (const row of rows) {
        if (row.message_text.trim() === canonical) {
          if (!matched || row.created_at_ms >= matched.created_at_ms) {
            matched = row
          }
        }
      }
      if (matched) {
        keepIds.add(matched.id)
        continue
      }
      // Cache existe mas nenhum log idêntico: não promover texto stale.
      continue
    }

    // Sem cache: mais recente sem foreign-lang; senão o mais recente.
    const sorted = [...rows].sort((a, b) => b.created_at_ms - a.created_at_ms)
    const clean = sorted.find((r) => !FOREIGN_LANG_RE.test(r.message_text))
    keepIds.add((clean ?? sorted[0]).id)
  }

  return keepIds
}

/**
 * Higieniza lista completa (já ordenada ASC) para o player.
 * - drop ahead-of-position (stale pós-reset), salvo includeAhead
 * - 1 trail-ai canônico por célula
 * - feedback contraditório alinhado
 * - feedback/instruction com matéria estrangeira quando canônico é math
 */
export function sanitizeHistoryLogs(
  logs: HistoryLogRow[],
  opts: {
    position: { stage: number; question: number } | null
    includeAhead?: boolean
    canonicalByCell?: Map<string, string>
  },
): HistoryLogRow[] {
  const includeAhead = opts.includeAhead === true
  const canonicalByCell = opts.canonicalByCell ?? new Map<string, string>()
  const position = opts.position

  const inScope = logs.filter((row) => {
    if (!position || includeAhead) return true
    return !isAheadOfPosition(row, position)
  })

  const keepTrailIds = pickCanonicalTrailAiLogs(inScope, canonicalByCell)

  const out: HistoryLogRow[] = []
  for (const row of inScope) {
    if (isTrailAiDeliveryLog(row)) {
      if (
        row.stage_number >= 1 &&
        row.question_number >= 1 &&
        !keepTrailIds.has(row.id)
      ) {
        continue
      }
      // Também drop se o texto é foreign e o canônico da célula não é.
      const cell = `${row.stage_number}-${row.question_number}`
      const canonical = canonicalByCell.get(cell) ?? ''
      if (
        FOREIGN_LANG_RE.test(row.message_text) &&
        canonical &&
        !FOREIGN_LANG_RE.test(canonical)
      ) {
        continue
      }
      out.push(row)
      continue
    }

    if (isExerciseFeedbackLog(row)) {
      let text = sanitizeContradictoryFeedback(row.message_text)
      const cell = `${row.stage_number + 1}-${row.question_number}`
      const nextCanonical = canonicalByCell.get(cell) ?? ''
      // Feedback que embute BLOCO antigo de outra matéria.
      if (
        FOREIGN_LANG_RE.test(text) &&
        nextCanonical &&
        !FOREIGN_LANG_RE.test(nextCanonical) &&
        blocoMismatchesSubject(text, nextCanonical)
      ) {
        text = text
          .split(/\r?\n/)
          .filter((line) => !FOREIGN_LANG_RE.test(line))
          .join('\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim()
        text = sanitizeContradictoryFeedback(text)
      }
      if (!text) continue
      out.push({ ...row, message_text: text })
      continue
    }

    // Instruction legado com conclusão / regência stale (não trail-ai tipado).
    if (
      row.sender === 'system' &&
      FOREIGN_LANG_RE.test(row.message_text) &&
      position &&
      row.question_number === position.question
    ) {
      const cell = `${row.stage_number}-${row.question_number}`
      const canonical = canonicalByCell.get(cell) ?? ''
      if (canonical && !FOREIGN_LANG_RE.test(canonical)) continue
    }

    out.push(row)
  }

  return out
}

/** Cache O(1) trail_ai_deliveries → mapa célula → texto canônico. */
async function loadCanonicalDeliveries(
  db: Firestore,
  studentId: string,
  trailId: string,
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  try {
    const snap = await db
      .collection(trailAiDeliveriesCollection())
      .where('student_id', '==', studentId)
      .where('trail_id', '==', trailId)
      .get()
    for (const doc of snap.docs) {
      const data = (doc.data() ?? {}) as Record<string, unknown>
      const status = typeof data.status === 'string' ? data.status : ''
      if (status && status !== 'ready') continue
      const stage =
        typeof data.stage_number === 'number' ? data.stage_number : 0
      const question =
        typeof data.question_number === 'number' ? data.question_number : 0
      const text =
        typeof data.message_text === 'string' ? data.message_text.trim() : ''
      if (stage >= 1 && question >= 1 && text) {
        map.set(`${stage}-${question}`, text)
      }
    }
  } catch {
    /* best-effort — sanitize ainda dedupe por recência */
  }
  return map
}

/**
 * Página de histórico para o player aluno.
 * Default: position-aware + limit (tail ~28–40), cursor `before` (created_at_ms).
 */
export async function getTrailHistoryPage(
  db: Firestore,
  input: {
    student_id: string
    trail_id: string
    limit?: number
    /** Exclusive upper bound on created_at_ms (paginação para trás). */
    before?: number | null
    /** Inclui logs à frente da posição (arquivados / debug). */
    include_ahead?: boolean
  },
): Promise<TrailHistoryPage> {
  const studentId = input.student_id.trim()
  const trailId = input.trail_id.trim()
  // limit<=0 → página inteira higienizada (ops/debug). Hot path default 40.
  const rawLimit = input.limit ?? 40
  const unlimited = rawLimit <= 0
  const limit = unlimited ? Number.POSITIVE_INFINITY : Math.max(1, Math.min(100, rawLimit))
  const before =
    typeof input.before === 'number' && Number.isFinite(input.before)
      ? input.before
      : null
  const includeAhead = input.include_ahead === true

  if (!studentId || !trailId) {
    return {
      logs: [],
      has_more: false,
      next_before: null,
      total_matching: 0,
      position: null,
    }
  }

  const studentTrailsCollection =
    process.env.STUDENT_TRAILS_COLLECTION ?? 'student_trails'
  const posSnap = await getStudentTrailPosition(
    db,
    studentTrailsCollection,
    studentId,
    trailId,
  )
  const position = posSnap
    ? {
        stage: posSnap.current_stage_number,
        question: posSnap.current_question_number,
      }
    : null

  const [all, canonicalByCell] = await Promise.all([
    listTrailConversationLogsSafe(db, studentId, trailId),
    loadCanonicalDeliveries(db, studentId, trailId),
  ])

  let sanitized = sanitizeHistoryLogs(all, {
    position,
    includeAhead,
    canonicalByCell,
  })

  if (before != null) {
    sanitized = sanitized.filter((row) => row.created_at_ms < before)
  }

  const totalMatching = sanitized.length
  // Preferência de question só no hot path (primeira página). Paginação
  // `before` continua temporal para expandir q81 etc.
  const slice =
    unlimited || sanitized.length <= limit
      ? sanitized
      : before == null
        ? preferCurrentQuestionWindow(sanitized, limit, position)
        : sanitized.slice(sanitized.length - limit)

  const oldest = slice[0]
  const hasMore = !unlimited && sanitized.length > slice.length
  const nextBefore =
    hasMore && oldest ? oldest.created_at_ms : null

  return {
    logs: slice,
    has_more: hasMore,
    next_before: nextBefore,
    total_matching: totalMatching,
    position: position
      ? {
          current_stage_number: position.stage,
          current_question_number: position.question,
        }
      : null,
  }
}

/**
 * Hot-path window: prioriza logs da question corrente (e no máximo a
 * anterior) em vez de um slice temporal cego que puxa aula PT inteira.
 * Ordem ASC preservada. Se a q atual sozinha exceder o limit, devolve o
 * tail dela.
 */
export function preferCurrentQuestionWindow(
  logs: HistoryLogRow[],
  limit: number,
  position: { stage: number; question: number } | null,
): HistoryLogRow[] {
  if (logs.length <= limit) return logs
  if (!position) return logs.slice(logs.length - limit)

  const currentQ = position.question
  const prevQ = currentQ > 1 ? currentQ - 1 : null
  const currentLogs = logs.filter((r) => r.question_number === currentQ)
  if (currentLogs.length >= limit) {
    return currentLogs.slice(currentLogs.length - limit)
  }

  if (prevQ == null) {
    // Sem question anterior: completa com o que couber do restante (ASC).
    const rest = logs.filter((r) => r.question_number !== currentQ)
    const need = limit - currentLogs.length
    const pad = rest.slice(Math.max(0, rest.length - need))
    return [...pad, ...currentLogs]
  }

  const prevLogs = logs.filter((r) => r.question_number === prevQ)
  const need = limit - currentLogs.length
  const prevPad = prevLogs.slice(Math.max(0, prevLogs.length - need))
  // Não completa com q≪atual (ex.: q81 PT) — expand/`before` recupera o resto.
  return [...prevPad, ...currentLogs]
}

/** Doc id helper re-export para ops/scripts. */
export { trailAiDeliveryDocId }

/** Heurística: texto de conclusão de aula (útil em testes). */
export function looksLikeLessonConclusion(text: string): boolean {
  return CONCLUDE_RE.test(text)
}
