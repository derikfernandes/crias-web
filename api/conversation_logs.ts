import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

import {
  createConversationLog,
  getConversationLogById,
  listConversationLogsByStudent,
  listConversationLogsByStudentAndTrail,
  listConversationLogsByStudentTrailAndStage,
  listRecentConversationLogs,
} from '../server/lib/conversationLogService'
import {
  validateConversationLogCreate,
  parseIntLoose,
  sanitizeString,
} from '../server/lib/conversationLogValidation'
import {
  assertServiceBearer,
  isTrailEngineError,
  trailEngineErrorToJson,
} from '../server/lib/trail-engine'

type Json = Record<string, unknown>

function jsonResponse(
  body: Json | Json[] | string,
  init?: ResponseInit,
): Response {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(init?.headers ?? {}),
    },
  })
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

function serializeTs(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'object' && value && 'toDate' in value) {
    try {
      const d = (value as { toDate: () => Date }).toDate()
      return d.toISOString()
    } catch {
      return null
    }
  }
  return null
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

function toConversationLogOutput(
  data: Record<string, unknown>,
  id: string,
): Json {
  const student_id =
    typeof data.student_id === 'string' ? data.student_id : ''
  const trail_id = typeof data.trail_id === 'string' ? data.trail_id : ''

  const stage_number =
    typeof data.stage_number === 'number' && Number.isFinite(data.stage_number)
      ? data.stage_number
      : 0
  const question_number =
    typeof data.question_number === 'number' &&
    Number.isFinite(data.question_number)
      ? data.question_number
      : 0

  const sender =
    typeof data.sender === 'string' && (data.sender === 'system' || data.sender === 'student')
      ? data.sender
      : 'system'

  const message_text =
    typeof data.message_text === 'string' ? data.message_text : ''

  const institution_id =
    typeof data.institution_id === 'string' ? data.institution_id : null

  const rawType =
    typeof data.message_type === 'string' ? data.message_type : null
  const message_type =
    rawType === 'text' ||
    rawType === 'instruction' ||
    rawType === 'exercise' ||
    rawType === 'feedback'
      ? rawType
      : null

  const metadata =
    data.metadata && typeof data.metadata === 'object' && !Array.isArray(data.metadata)
      ? (data.metadata as Record<string, unknown>)
      : null

  const created_at_brasilia =
    typeof data.created_at_brasilia === 'string' ? data.created_at_brasilia : null

  return {
    id,
    student_id,
    trail_id,
    stage_number,
    question_number,
    sender,
    message_text,
    institution_id,
    message_type,
    metadata,
    created_at: serializeTs(data.created_at),
    created_at_brasilia,
  }
}

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const id = url.searchParams.get('id')?.trim()

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  const respond = (status: number, body: Json): Response => {
    return new Response(JSON.stringify(body), {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        ...corsHeaders(),
      },
    })
  }

  // RT-H2: dumps de logs exigem service Bearer (sem IDOR anónimo).
  try {
    assertServiceBearer(request.headers)
  } catch (e) {
    if (isTrailEngineError(e)) {
      return respond(e.httpStatus, trailEngineErrorToJson(e) as Json)
    }
    throw e
  }

  let db: ReturnType<typeof getFirestore>
  try {
    db = getDb()
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : 'Erro ao inicializar Firebase Admin.'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        ...corsHeaders(),
      },
    })
  }

  const collection =
    process.env.CONVERSATION_LOGS_COLLECTION ?? 'conversation_logs'

  const qStudentId = url.searchParams.get('student_id')?.trim() || null
  const qTrailId = url.searchParams.get('trail_id')?.trim() || null
  const qStageNumber = parseIntLoose(url.searchParams.get('stage_number'))
  const recent = url.searchParams.get('recent') === '1'
  const limitParam = parseIntLoose(url.searchParams.get('limit'))
  const limit = limitParam && limitParam > 0 && limitParam <= 500 ? limitParam : 100

  try {
    if (request.method === 'GET') {
      if (id) {
        const snap = await getConversationLogById(db, collection, id)
        if (!snap.exists) return respond(404, { error: 'Not found' })
        const data = (snap.data() ?? {}) as Record<string, unknown>
        return jsonResponse(toConversationLogOutput(data, snap.id), {
          status: 200,
          headers: corsHeaders(),
        })
      }

      if (!qStudentId) {
        return respond(400, {
          error:
            'Informe ao menos "student_id" para listar logs.',
        })
      }

      if (recent) {
        const snap = await listRecentConversationLogs(
          db,
          collection,
          qStudentId,
          qTrailId,
          limit,
        )
        const items = snap.docs.map((d) =>
          toConversationLogOutput(
            (d.data() ?? {}) as Record<string, unknown>,
            d.id,
          ),
        )
        // já vem em ordem decrescente; se quiser asc basta inverter
        return jsonResponse(items as Json[], {
          status: 200,
          headers: corsHeaders(),
        })
      }

      if (qStudentId && qTrailId && qStageNumber !== null) {
        const snap = await listConversationLogsByStudentTrailAndStage(
          db,
          collection,
          qStudentId,
          qTrailId,
          qStageNumber,
        )
        const items = snap.docs.map((d) =>
          toConversationLogOutput(
            (d.data() ?? {}) as Record<string, unknown>,
            d.id,
          ),
        )
        return jsonResponse(items as Json[], {
          status: 200,
          headers: corsHeaders(),
        })
      }

      if (qStudentId && qTrailId) {
        const snap = await listConversationLogsByStudentAndTrail(
          db,
          collection,
          qStudentId,
          qTrailId,
        )
        const items = snap.docs.map((d) =>
          toConversationLogOutput(
            (d.data() ?? {}) as Record<string, unknown>,
            d.id,
          ),
        )
        return jsonResponse(items as Json[], {
          status: 200,
          headers: corsHeaders(),
        })
      }

      if (qStudentId) {
        const snap = await listConversationLogsByStudent(
          db,
          collection,
          qStudentId,
        )
        const items = snap.docs.map((d) =>
          toConversationLogOutput(
            (d.data() ?? {}) as Record<string, unknown>,
            d.id,
          ),
        )
        return jsonResponse(items as Json[], {
          status: 200,
          headers: corsHeaders(),
        })
      }

      return respond(400, {
        error:
          'Parâmetros inválidos para listagem de conversation_logs.',
      })
    }

    if (request.method === 'POST') {
      if (id) {
        return respond(400, { error: 'id não deve ser enviado em POST' })
      }

      let payload: unknown
      try {
        payload = await request.json()
      } catch {
        return respond(400, { error: 'JSON inválido' })
      }

      const validated = validateConversationLogCreate(payload)
      if (validated.ok === false) return respond(400, { error: validated.error })

      const { id: newId, created_at_brasilia } = await createConversationLog(
        db,
        collection,
        validated.data,
      )

      return jsonResponse(
        {
          id: newId,
          student_id: validated.data.student_id,
          trail_id: validated.data.trail_id,
          stage_number: validated.data.stage_number,
          question_number: validated.data.question_number,
          sender: validated.data.sender,
          message_text: validated.data.message_text,
          institution_id: validated.data.institution_id,
          message_type: validated.data.message_type,
          metadata: validated.data.metadata,
          created_at: null,
          created_at_brasilia,
        },
        { status: 201, headers: corsHeaders() },
      )
    }

    return respond(405, { error: `Método ${request.method} não permitido` })
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

  const init: RequestInit = { method, headers }

  if (!['GET', 'HEAD'].includes(method.toUpperCase())) {
    const body = req?.body
    if (body !== undefined && body !== null) {
      init.body = typeof body === 'string' ? body : JSON.stringify(body)
      if (!headers.has('content-type')) {
        headers.set('content-type', 'application/json; charset=utf-8')
      }
    }
  }

  const response = await handleRequest(new Request(url.toString(), init))

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

