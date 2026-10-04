import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { waitUntil } from '@vercel/functions'

import {
  createStudentTrail,
  getStudentTrailByComposite,
  getStudentTrailById,
  getStudentTrailPosition,
  advanceStudentTrailQuestion,
  advanceStudentTrailStage,
  markStudentTrailLastInteraction,
  completeStudentTrail,
  blockStudentTrail,
} from '../server/lib/studentTrailService'
import {
  advanceStudentTrailProgress,
  getNextContent,
  getStudentTrailStatus,
  listStudentTrailsForStudent,
} from '../server/lib/studentTrailProgressService'
import {
  validateStudentTrailCreate,
  parseStatus,
  parseIntLoose,
  type StudentTrailStatus,
} from '../server/lib/studentTrailValidation'
import { ensureTrailAiContent } from '../server/lib/trail-ai/ensureTrailAiContent'
import { getTrailHistoryPage } from '../server/lib/trail-engine/getHistory'
import { askMariaTutor } from '../server/lib/maria/askMariaTutor'

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
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
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

function sanitizeString(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s.length ? s : null
}

function toStudentTrailOutput(
  data: Record<string, unknown>,
  id: string,
): Json {
  const student_id =
    typeof data.student_id === 'string' ? data.student_id : ''
  const institution_id =
    typeof data.institution_id === 'string' ? data.institution_id : ''
  const trail_id =
    typeof data.trail_id === 'string' ? data.trail_id : ''

  const current_stage_number =
    typeof data.current_stage_number === 'number' &&
    Number.isFinite(data.current_stage_number)
      ? data.current_stage_number
      : 1
  const current_question_number =
    typeof data.current_question_number === 'number' &&
    Number.isFinite(data.current_question_number)
      ? data.current_question_number
      : 1

  const statusRaw =
    typeof data.status === 'string' ? data.status : 'not_started'
  const status: StudentTrailStatus =
    statusRaw === 'in_progress' ||
    statusRaw === 'completed' ||
    statusRaw === 'blocked'
      ? (statusRaw as StudentTrailStatus)
      : 'not_started'

  return {
    id,
    student_id,
    institution_id,
    trail_id,
    current_stage_number,
    current_question_number,
    status,
    started_at: serializeTs(data.started_at),
    completed_at: serializeTs(data.completed_at),
    last_interaction_at: serializeTs(data.last_interaction_at),
    created_at: serializeTs(data.created_at),
    updated_at: serializeTs(data.updated_at),
  }
}

async function validateStudentTrailInstitutionConsistency(
  db: ReturnType<typeof getFirestore>,
  studentId: string,
  trailId: string,
  requestedInstitutionId: string | null,
  studentTrailData?: Record<string, unknown>,
): Promise<{ ok: true; institutionId: string } | { ok: false; status: number; error: string }> {
  const studentsCollection = process.env.STUDENTS_COLLECTION ?? 'students'
  const trailsCollection = process.env.TRAILS_COLLECTION ?? 'trails'

  const [studentSnap, trailSnap] = await Promise.all([
    db.collection(studentsCollection).doc(studentId).get(),
    db.collection(trailsCollection).doc(trailId).get(),
  ])

  if (!studentSnap.exists) {
    return {
      ok: false,
      status: 404,
      error: `Aluno "${studentId}" não encontrado.`,
    }
  }
  if (!trailSnap.exists) {
    return {
      ok: false,
      status: 404,
      error: `Trilha "${trailId}" não encontrada.`,
    }
  }

  const studentData = (studentSnap.data() ?? {}) as Record<string, unknown>
  const trailData = (trailSnap.data() ?? {}) as Record<string, unknown>
  const studentInstitutionId =
    typeof studentData.institution_id === 'string'
      ? studentData.institution_id.trim()
      : ''
  const trailInstitutionId =
    typeof trailData.institution_id === 'string'
      ? trailData.institution_id.trim()
      : ''

  if (!studentInstitutionId || !trailInstitutionId) {
    return {
      ok: false,
      status: 409,
      error:
        'Inconsistência de instituição: aluno ou trilha sem institution_id válido.',
    }
  }
  if (studentInstitutionId !== trailInstitutionId) {
    return {
      ok: false,
      status: 409,
      error:
        'Inconsistência de instituição: aluno e trilha pertencem a instituições diferentes.',
    }
  }
  if (
    requestedInstitutionId &&
    requestedInstitutionId.trim() &&
    requestedInstitutionId.trim() !== trailInstitutionId
  ) {
    return {
      ok: false,
      status: 409,
      error:
        'Inconsistência de instituição: institution_id enviado não corresponde ao da trilha.',
    }
  }

  if (studentTrailData) {
    const studentTrailInstitutionId =
      typeof studentTrailData.institution_id === 'string'
        ? studentTrailData.institution_id.trim()
        : ''
    if (!studentTrailInstitutionId || studentTrailInstitutionId !== trailInstitutionId) {
      return {
        ok: false,
        status: 409,
        error:
          'Inconsistência de instituição no student_trails: execute saneamento antes de atualizar este registro.',
      }
    }
  }

  return { ok: true, institutionId: trailInstitutionId }
}

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const id = url.searchParams.get('id')?.trim()
  const action = url.searchParams.get('action')?.trim() || null

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
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
    process.env.STUDENT_TRAILS_COLLECTION ?? 'student_trails'

  const respond = (status: number, body: Json): Response => {
    return new Response(JSON.stringify(body), {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        ...corsHeaders(),
      },
    })
  }

  const qStudentId = url.searchParams.get('student_id')?.trim() || null
  const qTrailId = url.searchParams.get('trail_id')?.trim() || null

  try {
    // GET /student_trails/next-content
    // GET /student_trails/status
    // GET /student_trails/?student_id=
    // GET /student_trails?id=...
    // GET /student_trails?student_id=...&trail_id=...
    if (request.method === 'GET') {
      if (action === 'next-content') {
        if (!qStudentId || !qTrailId) {
          return respond(400, {
            status: 'error',
            code: 'invalid_payload',
            error: 'Informe student_id e trail_id.',
          })
        }
        const result = await getNextContent(db, qStudentId, qTrailId)
        if (!result.ok) {
          return respond(result.httpStatus, {
            status: 'error',
            code: result.code,
            message: result.message,
            error: result.message,
          })
        }
        // Mantém a function viva p/ prefetch da próxima AI (senão o serverless mata).
        if (result.background) {
          waitUntil(result.background)
        }
        return jsonResponse(result.data as Json, {
          status: 200,
          headers: corsHeaders(),
        })
      }

      if (action === 'history') {
        if (!qStudentId || !qTrailId) {
          return respond(400, {
            status: 'error',
            code: 'invalid_payload',
            error: 'Informe student_id e trail_id.',
          })
        }
        const limitParam = parseIntLoose(url.searchParams.get('limit'))
        const beforeParam = parseIntLoose(url.searchParams.get('before'))
        const includeAhead =
          url.searchParams.get('include_ahead') === '1' ||
          url.searchParams.get('include_ahead') === 'true'
        // Legacy: full=1 devolve dump completo (sem paginação) — ainda higienizado.
        const fullDump =
          url.searchParams.get('full') === '1' ||
          url.searchParams.get('full') === 'true'

        const page = await getTrailHistoryPage(db, {
          student_id: qStudentId,
          trail_id: qTrailId,
          limit: fullDump
            ? 0
            : limitParam && limitParam > 0
              ? limitParam
              : 40,
          before: beforeParam,
          include_ahead: includeAhead,
        })

        const mapped = page.logs.map((row) => ({
          id: row.id,
          student_id: row.student_id,
          trail_id: row.trail_id,
          stage_number: row.stage_number,
          question_number: row.question_number,
          sender: row.sender,
          message_text: row.message_text,
          institution_id: row.institution_id,
          message_type: row.message_type,
          metadata: row.metadata,
          created_at: null,
          created_at_brasilia: row.created_at_brasilia,
          created_at_ms: row.created_at_ms,
        }))

        return jsonResponse(
          {
            logs: mapped,
            has_more: page.has_more,
            next_before: page.next_before,
            total_matching: page.total_matching,
            position: page.position,
          } as unknown as Json,
          { status: 200, headers: corsHeaders() },
        )
      }

      if (action === 'status') {
        if (!qStudentId || !qTrailId) {
          return respond(400, {
            status: 'error',
            code: 'invalid_payload',
            error: 'Informe student_id e trail_id.',
          })
        }
        const result = await getStudentTrailStatus(db, qStudentId, qTrailId)
        if (!result.ok) {
          return respond(result.httpStatus, {
            status: 'error',
            code: result.code,
            message: result.message,
            error: result.message,
          })
        }
        return jsonResponse(result.data as Json, {
          status: 200,
          headers: corsHeaders(),
        })
      }

      if (id) {
        const snap = await getStudentTrailById(db, collection, id)
        if (!snap.exists) return respond(404, { error: 'Not found' })
        const data = (snap.data() ?? {}) as Record<string, unknown>
        return jsonResponse(toStudentTrailOutput(data, snap.id), {
          status: 200,
          headers: corsHeaders(),
        })
      }

      if (qStudentId && qTrailId) {
        const snap = await getStudentTrailByComposite(
          db,
          collection,
          qStudentId,
          qTrailId,
        )
        if (!snap.exists) return respond(404, { error: 'Not found' })
        const data = (snap.data() ?? {}) as Record<string, unknown>

        // Função runtime principal: posição atual do aluno na trilha.
        const pos = await getStudentTrailPosition(
          db,
          collection,
          qStudentId,
          qTrailId,
        )
        if (!pos) return respond(404, { error: 'Not found' })

        return jsonResponse(
          {
            ...pos,
            started_at: serializeTs(data.started_at),
            completed_at: serializeTs(data.completed_at),
            last_interaction_at: serializeTs(data.last_interaction_at),
          },
          { status: 200, headers: corsHeaders() },
        )
      }

      if (qStudentId) {
        const listed = await listStudentTrailsForStudent(db, qStudentId)
        if (!listed.ok) {
          return respond(listed.httpStatus, {
            status: 'error',
            code: listed.code,
            error: listed.message,
          })
        }
        return jsonResponse(listed.data as unknown as Json[], {
          status: 200,
          headers: corsHeaders(),
        })
      }

      return respond(400, {
        error:
          'Informe id, student_id, ou (student_id + trail_id) para buscar o progresso.',
      })
    }

    // POST /student_trails/advance
    // POST /student_trails/ (create)
    if (request.method === 'POST') {
      if (action === 'advance') {
        let payload: unknown
        try {
          payload = await request.json()
        } catch {
          payload = {}
        }
        const body = (payload ?? {}) as Record<string, unknown>
        const targetStudentId =
          qStudentId ?? sanitizeString(body.student_id) ?? null
        const targetTrailId =
          qTrailId ?? sanitizeString(body.trail_id) ?? null
        if (!targetStudentId || !targetTrailId) {
          return respond(400, {
            status: 'error',
            code: 'invalid_payload',
            error: 'Campos "student_id" e "trail_id" são obrigatórios.',
          })
        }
        const idempotencyKey =
          request.headers.get('Idempotency-Key')?.trim() ||
          sanitizeString(body.idempotency_key) ||
          null
        const expectedVersionRaw = body.expected_version
        const expectedVersion =
          expectedVersionRaw === undefined || expectedVersionRaw === null
            ? undefined
            : parseIntLoose(expectedVersionRaw) ?? undefined
        const result = await advanceStudentTrailProgress(
          db,
          targetStudentId,
          targetTrailId,
          {
            expected_version: expectedVersion,
            idempotency_key: idempotencyKey,
          },
        )
        if (!result.ok) {
          return respond(result.httpStatus, {
            status: 'error',
            code: result.code,
            message: result.message,
            error: result.message,
          })
        }
        if (result.background) {
          waitUntil(result.background)
        }
        return jsonResponse(result.data as Json, {
          status: 200,
          headers: corsHeaders(),
        })
      }

      if (action === 'ensure-ai') {
        let payload: unknown
        try {
          payload = await request.json()
        } catch {
          payload = {}
        }
        const body = (payload ?? {}) as Record<string, unknown>
        const targetStudentId =
          qStudentId ?? sanitizeString(body.student_id) ?? null
        const targetTrailId =
          qTrailId ?? sanitizeString(body.trail_id) ?? null
        if (!targetStudentId || !targetTrailId) {
          return respond(400, {
            status: 'error',
            code: 'invalid_payload',
            error: 'Campos "student_id" e "trail_id" são obrigatórios.',
          })
        }
        const stageNumber =
          typeof body.stage_number === 'number' && body.stage_number >= 1
            ? Math.trunc(body.stage_number)
            : undefined
        const questionNumber =
          typeof body.question_number === 'number' && body.question_number >= 1
            ? Math.trunc(body.question_number)
            : undefined
        const forceRegenerate =
          body.force_regenerate === true ||
          body.force_regenerate === 'true' ||
          url.searchParams.get('force_regenerate') === '1'
        try {
          const ensured = await ensureTrailAiContent(db, {
            student_id: targetStudentId,
            trail_id: targetTrailId,
            stage_number: stageNumber,
            question_number: questionNumber,
            force_regenerate: forceRegenerate,
          })
          return jsonResponse(
            { status: 'ok', ...ensured } as Json,
            { status: 200, headers: corsHeaders() },
          )
        } catch (e) {
          return respond(500, {
            status: 'error',
            code: 'internal_error',
            error: e instanceof Error ? e.message : 'Falha ensure-ai',
          })
        }
      }

      if (action === 'maria') {
        let payload: unknown
        try {
          payload = await request.json()
        } catch {
          payload = {}
        }
        const body = (payload ?? {}) as Record<string, unknown>
        const targetStudentId =
          qStudentId ?? sanitizeString(body.student_id) ?? null
        const targetTrailId =
          qTrailId ?? sanitizeString(body.trail_id) ?? null
        const message = sanitizeString(body.message)
        if (!targetStudentId || !targetTrailId || !message) {
          return respond(400, {
            status: 'error',
            code: 'invalid_payload',
            error: 'Campos "student_id", "trail_id" e "message" são obrigatórios.',
          })
        }
        try {
          const result = await askMariaTutor(db, {
            student_id: targetStudentId,
            trail_id: targetTrailId,
            message,
            stage_number:
              typeof body.stage_number === 'number'
                ? body.stage_number
                : undefined,
            question_number:
              typeof body.question_number === 'number'
                ? body.question_number
                : undefined,
          })
          return jsonResponse(result as unknown as Json, {
            status: 200,
            headers: corsHeaders(),
          })
        } catch (e) {
          return respond(500, {
            status: 'error',
            code: 'internal_error',
            error: e instanceof Error ? e.message : 'Falha Maria tutora',
          })
        }
      }

      if (id) {
        return respond(400, { error: 'id não deve ser enviado em POST' })
      }

      let payload: unknown
      try {
        payload = await request.json()
      } catch {
        return respond(400, { error: 'JSON inválido' })
      }

      const validated = validateStudentTrailCreate(payload)
      if (validated.ok === false) return respond(400, { error: validated.error })
      const consistency = await validateStudentTrailInstitutionConsistency(
        db,
        validated.data.student_id,
        validated.data.trail_id,
        validated.data.institution_id,
      )
      if (consistency.ok === false) {
        console.warn('[student_trails.create_rejected_institution_mismatch]', {
          student_id: validated.data.student_id,
          trail_id: validated.data.trail_id,
          institution_id: validated.data.institution_id,
          error: consistency.error,
        })
        return respond(consistency.status, { error: consistency.error })
      }

      try {
        const createPayload = {
          ...validated.data,
          institution_id: consistency.institutionId,
        }
        const { id: newId } = await createStudentTrail(
          db,
          collection,
          createPayload,
        )
        return jsonResponse(
          {
            id: newId,
            student_id: createPayload.student_id,
            institution_id: createPayload.institution_id,
            trail_id: createPayload.trail_id,
            current_stage_number: createPayload.current_stage_number,
            current_question_number: createPayload.current_question_number,
            status: createPayload.status,
            started_at: null,
            completed_at: null,
            last_interaction_at: null,
            created_at: null,
            updated_at: null,
          },
          { status: 201, headers: corsHeaders() },
        )
      } catch (e) {
        return respond(409, {
          error:
            e instanceof Error
              ? e.message
              : 'Conflito ao criar progresso da trilha',
        })
      }
    }

    // PUT /student_trails
    // Operações de runtime controladas por ?action=...
    if (request.method === 'PUT') {
      if (!action) {
        return respond(400, {
          error:
            'Parâmetro "action" é obrigatório em PUT (ex: advance_question, advance_stage, mark_last_interaction, complete, block, update_status, update_position).',
        })
      }

      let payload: unknown
      try {
        payload = await request.json()
      } catch {
        payload = {}
      }
      const body = (payload ?? {}) as Record<string, unknown>

      const targetStudentId =
        qStudentId ?? sanitizeString(body.student_id) ?? null
      const targetTrailId =
        qTrailId ?? sanitizeString(body.trail_id) ?? null

      if (!targetStudentId || !targetTrailId) {
        return respond(400, {
          error:
            'Campos "student_id" e "trail_id" são obrigatórios (query ou body) para operações de runtime.',
        })
      }
      const currentSnap = await getStudentTrailByComposite(
        db,
        collection,
        targetStudentId,
        targetTrailId,
      )
      if (!currentSnap.exists) return respond(404, { error: 'Not found' })

      const currentData = (currentSnap.data() ?? {}) as Record<string, unknown>
      const consistency = await validateStudentTrailInstitutionConsistency(
        db,
        targetStudentId,
        targetTrailId,
        null,
        currentData,
      )
      if (consistency.ok === false) {
        console.warn('[student_trails.runtime_rejected_institution_mismatch]', {
          action,
          student_id: targetStudentId,
          trail_id: targetTrailId,
          error: consistency.error,
        })
        return respond(consistency.status, { error: consistency.error })
      }

      if (action === 'advance_question') {
        const pos = await advanceStudentTrailQuestion(
          db,
          collection,
          targetStudentId,
          targetTrailId,
        )
        return jsonResponse(pos as Json, {
          status: 200,
          headers: corsHeaders(),
        })
      }

      if (action === 'advance_stage') {
        const pos = await advanceStudentTrailStage(
          db,
          collection,
          targetStudentId,
          targetTrailId,
        )
        return jsonResponse(pos as Json, {
          status: 200,
          headers: corsHeaders(),
        })
      }

      if (action === 'mark_last_interaction') {
        await markStudentTrailLastInteraction(
          db,
          collection,
          targetStudentId,
          targetTrailId,
        )
        return jsonResponse({ ok: true }, {
          status: 200,
          headers: corsHeaders(),
        })
      }

      if (action === 'complete') {
        await completeStudentTrail(
          db,
          collection,
          targetStudentId,
          targetTrailId,
        )
        return jsonResponse({ ok: true, status: 'completed' }, {
          status: 200,
          headers: corsHeaders(),
        })
      }

      if (action === 'block') {
        await blockStudentTrail(
          db,
          collection,
          targetStudentId,
          targetTrailId,
        )
        return jsonResponse({ ok: true, status: 'blocked' }, {
          status: 200,
          headers: corsHeaders(),
        })
      }

      if (action === 'update_status') {
        const status = parseStatus(body.status)
        if (!status) {
          return respond(400, {
            error:
              'Campo "status" inválido. Use not_started, in_progress, completed ou blocked.',
          })
        }

        const { updateStudentTrailStatus } = await import(
          '../server/lib/studentTrailService.js'
        )
        await updateStudentTrailStatus(
          db,
          collection,
          targetStudentId,
          targetTrailId,
          status,
        )
        return jsonResponse({ ok: true, status }, {
          status: 200,
          headers: corsHeaders(),
        })
      }

      if (action === 'update_position') {
        const stage = body.current_stage_number
        const question = body.current_question_number

        const parsedStage =
          stage === undefined || stage === null
            ? null
            : parseIntLoose(stage)
        const parsedQuestion =
          question === undefined || question === null
            ? null
            : parseIntLoose(question)

        if (parsedStage !== null && parsedStage < 1) {
          return respond(400, {
            error:
              'Campo "current_stage_number" deve ser um inteiro >= 1 quando enviado.',
          })
        }
        if (parsedQuestion !== null && parsedQuestion < 1) {
          return respond(400, {
            error:
              'Campo "current_question_number" deve ser um inteiro >= 1 quando enviado.',
          })
        }

        const snap = await getStudentTrailByComposite(
          db,
          collection,
          targetStudentId,
          targetTrailId,
        )
        if (!snap.exists) return respond(404, { error: 'Not found' })

        const patch: Record<string, unknown> = {}
        if (parsedStage !== null) patch.current_stage_number = parsedStage
        if (parsedQuestion !== null)
          patch.current_question_number = parsedQuestion

        if (Object.keys(patch).length === 0) {
          return respond(400, {
            error:
              'Envie ao menos um de: current_stage_number, current_question_number.',
          })
        }

        const { updateStudentTrailFields } = await import(
          '../server/lib/studentTrailService.js'
        )
        await updateStudentTrailFields(db, collection, snap.id, patch)

        return jsonResponse({ ok: true }, {
          status: 200,
          headers: corsHeaders(),
        })
      }

      return respond(400, {
        error:
          'Valor de "action" inválido. Use: advance_question, advance_stage, mark_last_interaction, complete, block, update_status, update_position.',
      })
    }

    if (request.method === 'DELETE') {
      return respond(405, {
        error:
          'Exclusão de student_trails não é suportada. Use operações de status/posição.',
      })
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

