import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

import {
  countExerciseAttemptsForQuestion,
  createExerciseAttemptWithQuestionLookup,
  getLastExerciseAttemptForQuestion,
  listExerciseAttemptsByQuestion,
  listExerciseAttemptsByStudent,
} from '../server/lib/exerciseAttemptService'
import {
  validateExerciseAttemptCreate,
  parseIntLoose,
  sanitizeString,
} from '../server/lib/exerciseAttemptValidation'
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

function toExerciseAttemptOutput(
  data: Record<string, unknown>,
  id: string,
): Json {
  const student_id =
    typeof data.student_id === 'string' ? data.student_id : ''
  const institution_id =
    typeof data.institution_id === 'string' ? data.institution_id : ''
  const trail_id = typeof data.trail_id === 'string' ? data.trail_id : ''

  const stage_number =
    typeof data.stage_number === 'number' &&
    Number.isFinite(data.stage_number) &&
    data.stage_number >= 1
      ? data.stage_number
      : 0

  const question_number =
    typeof data.question_number === 'number' &&
    Number.isFinite(data.question_number) &&
    data.question_number >= 1
      ? data.question_number
      : 0

  const student_answer =
    typeof data.student_answer === 'string' ? data.student_answer : ''

  const correct_option =
    typeof data.correct_option === 'string' ? data.correct_option : ''

  const is_correct =
    typeof data.is_correct === 'boolean' ? data.is_correct : false

  const score =
    typeof data.score === 'number' && Number.isFinite(data.score)
      ? data.score
      : null

  const feedback =
    typeof data.feedback === 'string'
      ? data.feedback
      : data.feedback === null
        ? null
        : null

  const attempt_number =
    typeof data.attempt_number === 'number' &&
    Number.isFinite(data.attempt_number) &&
    data.attempt_number >= 1
      ? data.attempt_number
      : 0

  return {
    id,
    student_id,
    institution_id,
    trail_id,
    stage_number,
    question_number,
    student_answer,
    correct_option,
    is_correct,
    score,
    feedback,
    attempt_number,
    attempted_at: serializeTs(data.attempted_at),
    created_at: serializeTs(data.created_at),
    updated_at: serializeTs(data.updated_at),
  }
}

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url)

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

  // RT-H2: dumps de attempts exigem service Bearer (sem IDOR anónimo).
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

  const attemptsCollection =
    process.env.EXERCISE_ATTEMPTS_COLLECTION ?? 'exercise_attempts'
  const questionsCollection =
    process.env.TRAIL_STAGE_QUESTIONS_COLLECTION ?? 'trail_stage_questions'
  const stagesCollection =
    process.env.TRAIL_STAGES_COLLECTION ?? 'trail_stages'

  const studentId = sanitizeString(url.searchParams.get('student_id'))
  const trailId = sanitizeString(url.searchParams.get('trail_id'))
  const stageNumber = parseIntLoose(url.searchParams.get('stage_number'))
  const questionNumber = parseIntLoose(url.searchParams.get('question_number'))
  const action = url.searchParams.get('action')?.trim() || null

  try {
    if (request.method === 'GET') {
      if (!studentId && !trailId) {
        return respond(400, {
          error:
            'Informe ao menos "student_id" ou ("trail_id" + "stage_number" + "question_number").',
        })
      }

      if (action === 'count') {
        if (!studentId || !trailId || stageNumber === null || questionNumber === null) {
          return respond(400, {
            error:
              'Para action=count informe "student_id", "trail_id", "stage_number" e "question_number".',
          })
        }

        const count = await countExerciseAttemptsForQuestion(
          db,
          attemptsCollection,
          studentId,
          trailId,
          stageNumber,
          questionNumber,
        )

        return jsonResponse(
          {
            student_id: studentId,
            trail_id: trailId,
            stage_number: stageNumber,
            question_number: questionNumber,
            attempt_count: count,
          },
          { status: 200, headers: corsHeaders() },
        )
      }

      if (action === 'last') {
        if (!studentId || !trailId || stageNumber === null || questionNumber === null) {
          return respond(400, {
            error:
              'Para action=last informe "student_id", "trail_id", "stage_number" e "question_number".',
          })
        }

        const snap = await getLastExerciseAttemptForQuestion(
          db,
          attemptsCollection,
          studentId,
          trailId,
          stageNumber,
          questionNumber,
        )

        if (!snap) {
          return respond(404, {
            error: 'Nenhuma tentativa encontrada para os parâmetros informados.',
          })
        }

        const data = (snap.data() ?? {}) as Record<string, unknown>
        return jsonResponse(toExerciseAttemptOutput(data, snap.id), {
          status: 200,
          headers: corsHeaders(),
        })
      }

      if (studentId && !trailId) {
        const snap = await listExerciseAttemptsByStudent(
          db,
          attemptsCollection,
          studentId,
        )

        const items = snap.docs.map((d) =>
          toExerciseAttemptOutput(
            (d.data() ?? {}) as Record<string, unknown>,
            d.id,
          ),
        )

        return jsonResponse(items as Json[], {
          status: 200,
          headers: corsHeaders(),
        })
      }

      if (trailId && stageNumber !== null && questionNumber !== null) {
        const snap = await listExerciseAttemptsByQuestion(
          db,
          attemptsCollection,
          trailId,
          stageNumber,
          questionNumber,
        )

        const items = snap.docs.map((d) =>
          toExerciseAttemptOutput(
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
          'Parâmetros inválidos para listagem de exercise_attempts. Use "student_id" ou "trail_id" + "stage_number" + "question_number", ou action=count/last.',
      })
    }

    if (request.method === 'POST') {
      let payload: unknown
      try {
        payload = await request.json()
      } catch {
        return respond(400, { error: 'JSON inválido' })
      }

      const validated = validateExerciseAttemptCreate(payload)
      if (validated.ok === false) return respond(400, { error: validated.error })

      const result = await createExerciseAttemptWithQuestionLookup(
        db,
        attemptsCollection,
        questionsCollection,
        stagesCollection,
        validated.data,
      )

      return jsonResponse(
        {
          id: result.id,
          student_id: validated.data.student_id,
          institution_id: validated.data.institution_id,
          trail_id: validated.data.trail_id,
          stage_number: validated.data.stage_number,
          question_number: validated.data.question_number,
          student_answer: validated.data.student_answer,
          is_correct: result.is_correct,
          score: result.score,
          attempt_number: result.attempt_number,
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

