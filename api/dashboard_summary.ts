import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

import {
  aggregateAgentUsage,
  isAgentTrailId,
  parsePeriodDays,
  periodCutoffMillis,
  type AgentUsageLogInput,
} from '../server/lib/agentUsage'
import {
  canAccessInstitution,
  requireGestaoAdminFromRequest,
} from '../server/lib/gestaoAdminAuth'
import { gestaoCorsHeaders } from '../server/lib/gestaoCors'

/**
 * Agregação server-side dos conversation_logs para o dashboard da gestão admin.
 *
 * Endpoint somente leitura (GET). Exige Bearer Firebase ID token da Gestão.
 * Escola: só a própria instituição. Master/super: todas.
 *
 * Resposta (formato compacto para ficar bem abaixo do limite de 4,5 MB de
 * payload das functions da Vercel — trilhas são referenciadas por índice em
 * `trail_ids` e as chaves são "trailIdx|stage|question"):
 * {
 *   institution_id: string,
 *   student_count: number,
 *   trail_ids: string[],
 *   students: Record<studentId, {
 *     answers: Record<"trailIdx|stage|question", string>,
 *     extra_done: Array<"trailIdx|stage|question">
 *   }>,
 *   agent_usage: { ... }  // ver specs/10_AGENT_USAGE_DASHBOARD.md
 * }
 *
 * O conjunto "feito" de cada aluno = chaves de `answers` + `extra_done`.
 * trail_ids de agente NÃO entram em trail_ids / students (progressão tN).
 */

type Json = Record<string, unknown>

const FIRESTORE_IN_LIMIT = 30

/** Cache em memória da instância (warm): reduz ~20s+ em recargas próximas. */
const SUMMARY_CACHE_TTL_MS = 90_000
const summaryCache = new Map<
  string,
  { expires: number; body: Json }
>()

function corsHeaders(request: Request): Record<string, string> {
  return gestaoCorsHeaders(request, 'GET,OPTIONS')
}

let cachedDb: ReturnType<typeof getFirestore> | null = null

function getDb() {
  if (cachedDb) return cachedDb

  const saJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON
  if (!saJson) {
    throw new Error(
      'FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON ausente. Defina no ambiente da Vercel.',
    )
  }

  const serviceAccount = JSON.parse(saJson) as ServiceAccount

  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount),
    })
  }

  cachedDb = getFirestore()
  return cachedDb
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

type AnswerCandidate = {
  text: string
  at: number
  isExercise: boolean
  logId: string
}

function logTimestampMillis(
  createdAt: unknown,
  createdAtBrasilia: unknown,
): number {
  if (
    createdAt &&
    typeof createdAt === 'object' &&
    'toMillis' in createdAt &&
    typeof (createdAt as { toMillis?: unknown }).toMillis === 'function'
  ) {
    try {
      const ms = (createdAt as { toMillis: () => number }).toMillis()
      if (ms > 0) return ms
    } catch {
      // usa fallback abaixo
    }
  }
  if (typeof createdAtBrasilia === 'string' && createdAtBrasilia) {
    const normalized = createdAtBrasilia.includes('T')
      ? createdAtBrasilia
      : createdAtBrasilia.replace(' ', 'T')
    const parsed = Date.parse(normalized)
    if (!Number.isNaN(parsed)) return parsed
  }
  return 0
}

/** Mesma regra do dashboard: prefere respostas de exercício, depois a mais recente. */
function pickBestStudentAnswer(candidates: AnswerCandidate[]): string {
  if (candidates.length === 0) return ''
  const exercises = candidates.filter((c) => c.isExercise)
  const pool = exercises.length > 0 ? exercises : candidates
  pool.sort((a, b) => {
    if (b.at !== a.at) return b.at - a.at
    return b.logId.localeCompare(a.logId)
  })
  return pool[0].text
}

async function handleRequest(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request),
    })
  }

  const respond = (
    status: number,
    body: Json,
    extraHeaders?: Record<string, string>,
  ): Response => {
    return new Response(JSON.stringify(body), {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        ...corsHeaders(request),
        ...(extraHeaders ?? {}),
      },
    })
  }

  if (request.method !== 'GET') {
    return respond(405, { error: `Método ${request.method} não permitido` })
  }

  const url = new URL(request.url)
  const institutionId = url.searchParams.get('institution_id')?.trim()
  if (!institutionId) {
    return respond(400, { error: 'Informe "institution_id".' })
  }

  const periodDays = parsePeriodDays(url.searchParams.get('period_days'))
  const cutoffMs = periodCutoffMillis(periodDays)

  let db: ReturnType<typeof getFirestore>
  try {
    db = getDb()
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : 'Erro ao inicializar Firebase Admin.'
    return respond(500, { error: msg })
  }

  const auth = await requireGestaoAdminFromRequest(
    db,
    request.headers.get('Authorization'),
  )
  if (!auth.ok) {
    return respond(auth.status, { error: auth.error, code: auth.code })
  }
  if (!canAccessInstitution(auth.principal, institutionId)) {
    return respond(403, {
      error: 'Sem permissão para esta instituição.',
      code: 'forbidden',
    })
  }

  const cacheKey = `${institutionId}|${periodDays}`
  const hit = summaryCache.get(cacheKey)
  if (hit && hit.expires > Date.now()) {
    return respond(200, hit.body, {
      'Cache-Control': 'private, max-age=60',
      'X-Summary-Cache': 'HIT',
    })
  }

  const studentsCollection = process.env.STUDENTS_COLLECTION ?? 'students'
  const trailsCollection = process.env.TRAILS_COLLECTION ?? 'trails'
  const logsCollection =
    process.env.CONVERSATION_LOGS_COLLECTION ?? 'conversation_logs'

  try {
    // select() sem campos: baixa apenas os IDs dos documentos.
    const [studentsSnap, trailsSnap] = await Promise.all([
      db
        .collection(studentsCollection)
        .where('institution_id', '==', institutionId)
        .select()
        .get(),
      db
        .collection(trailsCollection)
        .where('institution_id', '==', institutionId)
        .select()
        .get(),
    ])

    const studentIds = studentsSnap.docs.map((d) => d.id)
    const trailIdList = trailsSnap.docs.map((d) => d.id)
    const trailIndexById = new Map(trailIdList.map((id, idx) => [id, idx]))

    /** studentId -> chave compacta "trailIdx|stage|question" -> candidatos. */
    const perStudent = new Map<string, Map<string, AnswerCandidate[]>>()
    const agentLogs: AgentUsageLogInput[] = []

    const chunks = chunkArray(studentIds, FIRESTORE_IN_LIMIT)
    await Promise.all(
      chunks.map(async (chunk) => {
        // Sem filtro de sender: progressão usa sender=student; agentes contam todos.
        const snap = await db
          .collection(logsCollection)
          .where('student_id', 'in', chunk)
          .select(
            'student_id',
            'trail_id',
            'stage_number',
            'question_number',
            'message_text',
            'message_type',
            'sender',
            'created_at',
            'created_at_brasilia',
          )
          .get()

        for (const doc of snap.docs) {
          const data = doc.data() as Record<string, unknown>

          const studentId =
            typeof data.student_id === 'string' ? data.student_id : ''
          const trailId = typeof data.trail_id === 'string' ? data.trail_id : ''
          if (!studentId || !trailId) continue

          const at = logTimestampMillis(data.created_at, data.created_at_brasilia)

          if (isAgentTrailId(trailId)) {
            // Filtro de período aplica só ao uso de agentes, não à progressão tN.
            if (cutoffMs > 0 && at > 0 && at < cutoffMs) continue
            agentLogs.push({ student_id: studentId, trail_id: trailId, at })
            continue
          }

          // Progressão: apenas mensagens do aluno em trilhas reais da instituição.
          if (data.sender !== 'student') continue
          const trailIdx = trailIndexById.get(trailId)
          if (trailIdx === undefined) continue

          const stageRaw = data.stage_number
          const questionRaw = data.question_number
          const stageNumber =
            typeof stageRaw === 'number' && Number.isFinite(stageRaw)
              ? stageRaw
              : 0
          const questionNumber =
            typeof questionRaw === 'number' && Number.isFinite(questionRaw)
              ? questionRaw
              : 0
          if (stageNumber < 1 || questionNumber < 1) continue

          const compactKey = `${trailIdx}|${stageNumber}|${questionNumber}`
          let byKey = perStudent.get(studentId)
          if (!byKey) {
            byKey = new Map()
            perStudent.set(studentId, byKey)
          }
          const list = byKey.get(compactKey) ?? []
          list.push({
            text: typeof data.message_text === 'string' ? data.message_text : '',
            at,
            isExercise: data.message_type === 'exercise',
            logId: doc.id,
          })
          byKey.set(compactKey, list)
        }
      }),
    )

    const students: Record<
      string,
      { answers: Record<string, string>; extra_done: string[] }
    > = {}
    for (const [studentId, byKey] of perStudent) {
      const answers: Record<string, string> = {}
      const extraDone: string[] = []
      for (const [key, candidates] of byKey) {
        const best = pickBestStudentAnswer(candidates)
        if (best.trim()) answers[key] = best
        else extraDone.push(key)
      }
      students[studentId] = { answers, extra_done: extraDone }
    }

    const agent_usage = aggregateAgentUsage(agentLogs, periodDays)

    const body: Json = {
      institution_id: institutionId,
      student_count: studentIds.length,
      trail_ids: trailIdList,
      students,
      agent_usage,
    }
    summaryCache.set(cacheKey, {
      expires: Date.now() + SUMMARY_CACHE_TTL_MS,
      body,
    })
    return respond(200, body, {
      'Cache-Control': 'private, max-age=60',
      'X-Summary-Cache': 'MISS',
    })
  } catch (e) {
    return respond(500, {
      error: e instanceof Error ? e.message : 'Erro interno',
    })
  }
}

export default async function handler(req: any, res: any): Promise<void> {
  const method = (req?.method ?? 'GET') as string
  const host = (req?.headers?.host ?? 'localhost') as string
  const path = (req?.url ?? '/') as string
  const url = new URL(path, `https://${host}`)

  const headers = new Headers()
  const rawHeaders = (req?.headers ?? {}) as Record<string, unknown>
  for (const [k, v] of Object.entries(rawHeaders)) {
    if (typeof v === 'string') headers.set(k, v)
    else if (Array.isArray(v)) headers.set(k, v.join(','))
  }

  const response = await handleRequest(
    new Request(url.toString(), { method, headers }),
  )

  res.statusCode = response.status
  response.headers.forEach((value, key) => {
    try {
      res.setHeader(key, value)
    } catch {
      // ignora headers inválidos no ambiente serverless
    }
  })

  const ab = await response.arrayBuffer()
  res.end(Buffer.from(ab))
}
