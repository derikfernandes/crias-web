import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

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
  updateStudentTrailPosition,
} from '../server/lib/studentTrailService'
import {
  validateStudentTrailCreate,
  parseStatus,
  parseIntLoose,
  type StudentTrailStatus,
} from '../server/lib/studentTrailValidation'
import {
  authorizeStudentResource,
  resolveAuthPrincipal,
} from '../server/lib/studentAuth'
import {
  advance as engineAdvance,
  assertServiceBearer,
  defaultCollectionNames,
  ensureStepDelivery,
  getNextContent,
  getTrailConversation,
  getTrailHistory,
  getStatus as engineGetStatus,
  isTrailEngineError,
  isMutationMethod,
  listEnrollmentsForStudent,
  loadTrailTotals,
  submitExerciseAnswer,
  trailEngineErrorToJson,
  type TrailChannel,
  type StudentTrailProgress,
} from '../server/lib/trail-engine'
import { ensureTrailAiContent } from '../server/lib/trail-ai/ensureTrailAiContent'

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
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, Idempotency-Key, X-Request-Id',
  }
}

/** Allowlist RT-C1 — nunca tratar facade arbitrário como “skip Bearer”. */
const KNOWN_FACADES = new Set([
  'home',
  'next-content',
  'status',
  'advance',
  'submit-exercise',
  'history',
  'conversation',
  'ensure-ai',
  'ensure-delivery',
])

function isKnownFacade(facade: string | null): boolean {
  return facade !== null && KNOWN_FACADES.has(facade)
}

function requireFacadeAuth(
  request: Request,
  targetStudentId: string,
):
  | { ok: true; principal: ReturnType<typeof resolveAuthPrincipal> }
  | { ok: false; status: number; body: Json } {
  const principal = resolveAuthPrincipal(request.headers.get('Authorization'))
  const authz = authorizeStudentResource(principal, targetStudentId)
  if (authz.ok) return { ok: true, principal }
  return {
    ok: false,
    status: authz.status,
    body: {
      status: 'error',
      code: authz.code,
      error: authz.error,
    },
  }
}

/**
 * Canal efectivo: aluno HMAC → sempre `app` (RT-M2).
 * Service/admin podem setar whatsapp/admin.
 */
function resolveMutationChannel(
  request: Request,
  requested: TrailChannel | null,
): TrailChannel {
  const principal = resolveAuthPrincipal(request.headers.get('Authorization'))
  if (principal.kind === 'student') return 'app'
  return requested ?? 'app'
}

function parseChannel(v: unknown): TrailChannel | null {
  if (v === 'whatsapp' || v === 'app' || v === 'admin') return v
  return null
}

/** Payload por matrícula na fachada `home` (cards “Minhas trilhas”). */
async function buildHomeEnrollmentCard(
  db: ReturnType<typeof getFirestore>,
  enrollment: StudentTrailProgress,
): Promise<Json> {
  const trailsCollection = process.env.TRAILS_COLLECTION ?? 'trails'
  const institutionsCollection =
    process.env.INSTITUTIONS_COLLECTION ?? 'institutions'
  const trailSnap = await db
    .collection(trailsCollection)
    .doc(enrollment.trail_id)
    .get()
  const trailData = (trailSnap.data() ?? {}) as Record<string, unknown>
  const trailTitle =
    typeof trailData.name === 'string'
      ? trailData.name
      : typeof trailData.title === 'string'
        ? trailData.title
        : enrollment.trail_id
  const subject =
    typeof trailData.subject === 'string' && trailData.subject.trim()
      ? trailData.subject.trim()
      : null
  const trailInstitutionId =
    typeof trailData.institution_id === 'string' && trailData.institution_id
      ? trailData.institution_id
      : enrollment.institution_id

  let institutionName: string | null = null
  if (trailInstitutionId) {
    try {
      const instSnap = await db
        .collection(institutionsCollection)
        .doc(trailInstitutionId)
        .get()
      const instData = (instSnap.data() ?? {}) as Record<string, unknown>
      if (typeof instData.name === 'string' && instData.name.trim()) {
        institutionName = instData.name.trim()
      }
    } catch {
      institutionName = null
    }
  }

  const next = await getNextContent(db, {
    student_id: enrollment.student_id,
    trail_id: enrollment.trail_id,
    channel: 'app',
  })

  let progress_ratio: number | null = null
  let total_stages: number | null = null
  let total_questions: number | null = null
  try {
    const totals = await loadTrailTotals(
      db,
      enrollment.trail_id,
      defaultCollectionNames(),
    )
    total_stages = totals.total_stages
    total_questions = totals.total_questions
    const denom = Math.max(1, totals.total_stages * totals.total_questions)
    if (enrollment.status === 'completed' || next.next_action === 'completed') {
      progress_ratio = 1
    } else {
      const idx =
        (Math.max(1, enrollment.current_stage_number) - 1) *
          totals.total_questions +
        Math.max(1, enrollment.current_question_number) -
        1
      progress_ratio = Math.max(0, Math.min(1, idx / denom))
    }
  } catch {
    progress_ratio = null
    total_stages = null
    total_questions = null
  }

  const stages_completed =
    enrollment.status === 'completed' || next.next_action === 'completed'
      ? typeof total_stages === 'number' && total_stages > 0
        ? total_stages
        : Math.max(0, enrollment.current_stage_number)
      : Math.max(0, enrollment.current_stage_number - 1)

  return {
    enrollment: {
      student_id: enrollment.student_id,
      trail_id: enrollment.trail_id,
      institution_id: enrollment.institution_id,
      current_stage_number: enrollment.current_stage_number,
      current_question_number: enrollment.current_question_number,
      progress_status: enrollment.status,
      progress_version: enrollment.progress_version,
      last_channel: enrollment.last_channel,
      last_interaction_at: serializeTs(enrollment.last_interaction_at),
    },
    trail: {
      id: enrollment.trail_id,
      title: trailTitle,
      subject,
      institution_id: trailInstitutionId || null,
      institution_name: institutionName,
    },
    next_action: next.next_action,
    is_released: next.is_released,
    stage_type: next.stage_type ?? null,
    progress_ratio,
    total_stages,
    total_questions,
    stages_completed,
  }
}

function serializeLastDelivered(value: unknown): Json | null {
  if (!value || typeof value !== 'object') return null
  const o = value as Record<string, unknown>
  const stage_number =
    typeof o.stage_number === 'number' && Number.isFinite(o.stage_number)
      ? o.stage_number
      : null
  const question_number =
    typeof o.question_number === 'number' && Number.isFinite(o.question_number)
      ? o.question_number
      : null
  const content_fingerprint =
    typeof o.content_fingerprint === 'string' ? o.content_fingerprint : null
  if (
    stage_number === null ||
    question_number === null ||
    content_fingerprint === null
  ) {
    return null
  }
  return { stage_number, question_number, content_fingerprint }
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
    progress_version:
      typeof data.progress_version === 'number' &&
      Number.isFinite(data.progress_version)
        ? data.progress_version
        : 0,
    last_idempotency_key:
      typeof data.last_idempotency_key === 'string'
        ? data.last_idempotency_key
        : null,
    last_channel: parseChannel(data.last_channel),
    last_delivered: serializeLastDelivered(data.last_delivered),
    last_advance_at: serializeTs(data.last_advance_at),
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
  const facadeRaw = url.searchParams.get('facade')?.trim() || null
  const facade = facadeRaw
  const requestIdempotencyKey =
    request.headers.get('Idempotency-Key')?.trim() ||
    request.headers.get('idempotency-key')?.trim() ||
    null

  // RT-C1: facade desconhecido NÃO salta Bearer — 400 + allowlist.
  if (facade !== null && !isKnownFacade(facade)) {
    return respond(400, {
      status: 'error',
      code: 'invalid_facade',
      error:
        'Parâmetro facade inválido. Use: home, next-content, status, advance, submit-exercise, history, conversation, ensure-ai, ensure-delivery.',
    })
  }

  // Mutações legadas (Chatis CRUD / ?action=): service Bearer (Ciclo 1 B1).
  // Fachada conhecida: AuthZ via requireFacadeAuth (service OU sessão aluno).
  if (isMutationMethod(request.method) && !isKnownFacade(facade)) {
    try {
      assertServiceBearer(request.headers)
    } catch (e) {
      if (isTrailEngineError(e)) {
        return respond(e.httpStatus, trailEngineErrorToJson(e) as Json)
      }
      throw e
    }
  }

  try {
    // Fachada Wave A/B: GET next-content | history | status | home | POST advance | submit-exercise
    if (facade === 'home' && request.method === 'GET') {
      const homeStudentId =
        qStudentId ||
        (() => {
          const p = resolveAuthPrincipal(request.headers.get('Authorization'))
          return p.kind === 'student' ? p.claims.student_id : null
        })()
      if (!homeStudentId) {
        return respond(401, {
          status: 'error',
          code: 'unauthorized',
          error: 'Autenticação necessária.',
        })
      }
      const authz = requireFacadeAuth(request, homeStudentId)
      if (!authz.ok) return respond(authz.status, authz.body)

      try {
        const rows = await listEnrollmentsForStudent(db, homeStudentId)
        if (rows.length === 0) {
          return jsonResponse(
            {
              status: 'ok',
              student_id: homeStudentId,
              enrollment: null,
              trail: null,
              enrollments: [],
            },
            { status: 200, headers: corsHeaders() },
          )
        }

        const enrollments = await Promise.all(
          rows.map((row) => buildHomeEnrollmentCard(db, row)),
        )
        const primary = enrollments[0] as Json
        const primaryEnrollment = primary.enrollment as Json
        const primaryTrail = primary.trail as Json

        return jsonResponse(
          {
            status: 'ok',
            student_id: homeStudentId,
            // Compat: primeiro vínculo = trilha ativa (U3 / getActiveEnrollment).
            enrollment: primaryEnrollment,
            trail: primaryTrail,
            next_action: primary.next_action,
            is_released: primary.is_released,
            stage_type: primary.stage_type,
            progress_ratio: primary.progress_ratio,
            total_stages: primary.total_stages,
            total_questions: primary.total_questions,
            enrollments,
          },
          { status: 200, headers: corsHeaders() },
        )
      } catch (e) {
        if (isTrailEngineError(e)) {
          return respond(e.httpStatus, trailEngineErrorToJson(e) as Json)
        }
        throw e
      }
    }

    if (facade === 'next-content' && request.method === 'GET') {
      if (!qStudentId || !qTrailId) {
        return respond(400, {
          status: 'error',
          code: 'invalid_payload',
          error: 'Informe student_id e trail_id.',
        })
      }
      const authz = requireFacadeAuth(request, qStudentId)
      if (!authz.ok) return respond(authz.status, authz.body)
      try {
        const content = await getNextContent(db, {
          student_id: qStudentId,
          trail_id: qTrailId,
          channel: resolveMutationChannel(
            request,
            parseChannel(url.searchParams.get('channel')),
          ),
        })
        return jsonResponse(content as Json, {
          status: 200,
          headers: corsHeaders(),
        })
      } catch (e) {
        if (isTrailEngineError(e)) {
          return respond(e.httpStatus, trailEngineErrorToJson(e) as Json)
        }
        throw e
      }
    }

    if (facade === 'ensure-ai' && request.method === 'POST') {
      let body: Record<string, unknown> = {}
      try {
        body = (await request.json()) as Record<string, unknown>
      } catch {
        body = {}
      }
      const studentId =
        sanitizeString(body.student_id) ?? qStudentId ?? null
      const trailId = sanitizeString(body.trail_id) ?? qTrailId ?? null
      if (!studentId || !trailId) {
        return respond(400, {
          status: 'error',
          code: 'invalid_payload',
          error: 'Informe student_id e trail_id.',
        })
      }
      const authz = requireFacadeAuth(request, studentId)
      if (!authz.ok) return respond(authz.status, authz.body)
      try {
        const ensured = await ensureTrailAiContent(db, {
          student_id: studentId,
          trail_id: trailId,
          channel: resolveMutationChannel(
            request,
            parseChannel(
              typeof body.channel === 'string'
                ? body.channel
                : url.searchParams.get('channel'),
            ),
          ),
        })
        return jsonResponse(
          {
            status: 'ok',
            ...ensured,
          } as Json,
          { status: 200, headers: corsHeaders() },
        )
      } catch (e) {
        if (isTrailEngineError(e)) {
          return respond(e.httpStatus, trailEngineErrorToJson(e) as Json)
        }
        throw e
      }
    }

    if (facade === 'ensure-delivery' && request.method === 'POST') {
      let body: Record<string, unknown> = {}
      try {
        body = (await request.json()) as Record<string, unknown>
      } catch {
        body = {}
      }
      const studentId =
        sanitizeString(body.student_id) ?? qStudentId ?? null
      const trailId = sanitizeString(body.trail_id) ?? qTrailId ?? null
      if (!studentId || !trailId) {
        return respond(400, {
          status: 'error',
          code: 'invalid_payload',
          error: 'Informe student_id e trail_id.',
        })
      }
      const authz = requireFacadeAuth(request, studentId)
      if (!authz.ok) return respond(authz.status, authz.body)
      try {
        const ensured = await ensureStepDelivery(db, {
          student_id: studentId,
          trail_id: trailId,
          channel: resolveMutationChannel(
            request,
            parseChannel(
              typeof body.channel === 'string'
                ? body.channel
                : url.searchParams.get('channel'),
            ),
          ),
        })
        return jsonResponse(
          {
            status: 'ok',
            ...ensured,
          } as Json,
          { status: 200, headers: corsHeaders() },
        )
      } catch (e) {
        if (isTrailEngineError(e)) {
          return respond(e.httpStatus, trailEngineErrorToJson(e) as Json)
        }
        throw e
      }
    }

    if (facade === 'conversation' && request.method === 'GET') {
      if (!qStudentId || !qTrailId) {
        return respond(400, {
          status: 'error',
          code: 'invalid_payload',
          error: 'Informe student_id e trail_id.',
        })
      }
      const authz = requireFacadeAuth(request, qStudentId)
      if (!authz.ok) return respond(authz.status, authz.body)
      try {
        const conversation = await getTrailConversation(db, {
          student_id: qStudentId,
          trail_id: qTrailId,
        })
        return jsonResponse(conversation as Json, {
          status: 200,
          headers: corsHeaders(),
        })
      } catch (e) {
        if (isTrailEngineError(e)) {
          return respond(e.httpStatus, trailEngineErrorToJson(e) as Json)
        }
        throw e
      }
    }

    if (facade === 'history' && request.method === 'GET') {
      if (!qStudentId || !qTrailId) {
        return respond(400, {
          status: 'error',
          code: 'invalid_payload',
          error: 'Informe student_id e trail_id.',
        })
      }
      const authz = requireFacadeAuth(request, qStudentId)
      if (!authz.ok) return respond(authz.status, authz.body)
      try {
        const history = await getTrailHistory(db, {
          student_id: qStudentId,
          trail_id: qTrailId,
        })
        return jsonResponse(history as Json, {
          status: 200,
          headers: corsHeaders(),
        })
      } catch (e) {
        if (isTrailEngineError(e)) {
          return respond(e.httpStatus, trailEngineErrorToJson(e) as Json)
        }
        throw e
      }
    }

    if (facade === 'status' && request.method === 'GET') {
      if (!qStudentId || !qTrailId) {
        return respond(400, {
          status: 'error',
          code: 'invalid_payload',
          error: 'Informe student_id e trail_id.',
        })
      }
      const authz = requireFacadeAuth(request, qStudentId)
      if (!authz.ok) return respond(authz.status, authz.body)
      try {
        const statusDoc = await engineGetStatus(db, qStudentId, qTrailId)
        const forStudent = authz.principal.kind === 'student'
        return jsonResponse(
          {
            status: 'ok',
            student_id: statusDoc.student_id,
            trail_id: statusDoc.trail_id,
            institution_id: statusDoc.institution_id,
            current_stage_number: statusDoc.current_stage_number,
            current_question_number: statusDoc.current_question_number,
            progress_status: statusDoc.status,
            progress_version: statusDoc.progress_version,
            last_channel: statusDoc.last_channel,
            // RT-L1: não expor last_idempotency_key ao aluno
            ...(forStudent
              ? {}
              : { last_idempotency_key: statusDoc.last_idempotency_key }),
            last_delivered: statusDoc.last_delivered,
            last_advance_at: serializeTs(statusDoc.last_advance_at),
            started_at: serializeTs(statusDoc.started_at),
            completed_at: serializeTs(statusDoc.completed_at),
            last_interaction_at: serializeTs(statusDoc.last_interaction_at),
          },
          { status: 200, headers: corsHeaders() },
        )
      } catch (e) {
        if (isTrailEngineError(e)) {
          return respond(e.httpStatus, trailEngineErrorToJson(e) as Json)
        }
        throw e
      }
    }

    if (facade === 'advance' && request.method === 'POST') {
      let payload: unknown
      try {
        payload = await request.json()
      } catch {
        payload = {}
      }
      const body = (payload ?? {}) as Record<string, unknown>
      const studentId =
        qStudentId ?? sanitizeString(body.student_id) ?? null
      const trailId = qTrailId ?? sanitizeString(body.trail_id) ?? null
      const requestedChannel =
        parseChannel(body.channel) ??
        parseChannel(url.searchParams.get('channel'))
      const idempotencyKey =
        request.headers.get('Idempotency-Key')?.trim() ||
        sanitizeString(body.idempotency_key) ||
        null
      const expectedVersion =
        body.expected_version === undefined || body.expected_version === null
          ? undefined
          : parseIntLoose(body.expected_version) ?? undefined
      const reasonRaw = sanitizeString(body.reason) ?? 'delivered'
      const reason =
        reasonRaw === 'answered' ||
        reasonRaw === 'skip' ||
        reasonRaw === 'delivered'
          ? reasonRaw
          : 'delivered'

      if (!studentId || !trailId) {
        return respond(400, {
          status: 'error',
          code: 'invalid_payload',
          error: 'student_id e trail_id são obrigatórios.',
        })
      }
      const authz = requireFacadeAuth(request, studentId)
      if (!authz.ok) return respond(authz.status, authz.body)
      const channel = resolveMutationChannel(request, requestedChannel)
      if (!idempotencyKey) {
        return respond(400, {
          status: 'error',
          code: 'invalid_payload',
          error: 'Header Idempotency-Key (ou body.idempotency_key) é obrigatório.',
        })
      }
      // RT-M1: sessão aluno exige expected_version (mitiga double-key / double-tap).
      if (
        authz.principal.kind === 'student' &&
        expectedVersion === undefined
      ) {
        return respond(400, {
          status: 'error',
          code: 'invalid_payload',
          error:
            'expected_version é obrigatório para sessão aluno (optimistic lock).',
        })
      }

      try {
        const result = await engineAdvance(db, {
          student_id: studentId,
          trail_id: trailId,
          idempotency_key: idempotencyKey,
          channel,
          reason,
          expected_version: expectedVersion ?? undefined,
          mark_delivered: true,
        })
        return jsonResponse(
          {
            status: result.status === 'replay' ? 'ok' : 'ok',
            replay: result.status === 'replay',
            next_stage_number: result.next_stage_number,
            next_question_number: result.next_question_number,
            completed: result.completed,
            progress_version: result.progress_version,
            channel: result.channel,
            idempotency_key: result.idempotency_key,
          },
          { status: 200, headers: corsHeaders() },
        )
      } catch (e) {
        if (isTrailEngineError(e)) {
          return respond(e.httpStatus, trailEngineErrorToJson(e) as Json)
        }
        throw e
      }
    }

    if (facade === 'submit-exercise' && request.method === 'POST') {
      let payload: unknown
      try {
        payload = await request.json()
      } catch {
        payload = {}
      }
      const body = (payload ?? {}) as Record<string, unknown>
      const studentId =
        qStudentId ?? sanitizeString(body.student_id) ?? null
      const trailId = qTrailId ?? sanitizeString(body.trail_id) ?? null
      const institutionId = sanitizeString(body.institution_id)
      const stageNumber = parseIntLoose(body.stage_number)
      const questionNumber = parseIntLoose(body.question_number)
      const answer = sanitizeString(body.student_answer) ?? sanitizeString(body.answer)
      const requestedChannel =
        parseChannel(body.channel) ??
        parseChannel(url.searchParams.get('channel'))
      const idempotencyKey =
        request.headers.get('Idempotency-Key')?.trim() ||
        sanitizeString(body.idempotency_key) ||
        null
      const expectedVersion =
        body.expected_version === undefined || body.expected_version === null
          ? undefined
          : parseIntLoose(body.expected_version) ?? undefined

      if (!studentId || !trailId || !institutionId) {
        return respond(400, {
          status: 'error',
          code: 'invalid_payload',
          error: 'student_id, trail_id e institution_id são obrigatórios.',
        })
      }
      const authz = requireFacadeAuth(request, studentId)
      if (!authz.ok) return respond(authz.status, authz.body)
      const channel = resolveMutationChannel(request, requestedChannel)
      if (!idempotencyKey || !answer || stageNumber === null || questionNumber === null) {
        return respond(400, {
          status: 'error',
          code: 'invalid_payload',
          error:
            'Idempotency-Key, student_answer, stage_number e question_number são obrigatórios.',
        })
      }
      // RT-M1: sessão aluno exige expected_version.
      if (
        authz.principal.kind === 'student' &&
        expectedVersion === undefined
      ) {
        return respond(400, {
          status: 'error',
          code: 'invalid_payload',
          error:
            'expected_version é obrigatório para sessão aluno (optimistic lock).',
        })
      }

      try {
        const result = await submitExerciseAnswer(db, {
          student_id: studentId,
          institution_id: institutionId,
          trail_id: trailId,
          stage_number: stageNumber,
          question_number: questionNumber,
          student_answer: answer,
          idempotency_key: idempotencyKey,
          channel,
          expected_version: expectedVersion ?? undefined,
        })
        return jsonResponse(
          {
            status: 'ok',
            ...result,
          },
          { status: 200, headers: corsHeaders() },
        )
      } catch (e) {
        if (isTrailEngineError(e)) {
          return respond(e.httpStatus, trailEngineErrorToJson(e) as Json)
        }
        throw e
      }
    }

    // GET /student_trails/
    // GET /student_trails?id=...
    // GET /student_trails?student_id=...&trail_id=...
    // RT-H1: leitura sensível exige service Bearer OU sessão do próprio aluno.
    if (request.method === 'GET') {
      if (id) {
        const snap = await getStudentTrailById(db, collection, id)
        if (!snap.exists) return respond(404, { error: 'Not found' })
        const data = (snap.data() ?? {}) as Record<string, unknown>
        const ownerId =
          typeof data.student_id === 'string' ? data.student_id.trim() : ''
        if (!ownerId) {
          return respond(404, { error: 'Not found' })
        }
        const authz = requireFacadeAuth(request, ownerId)
        if (!authz.ok) return respond(authz.status, authz.body)
        const out = toStudentTrailOutput(data, snap.id)
        if (authz.principal.kind === 'student') {
          delete out.last_idempotency_key
        }
        return jsonResponse(out, {
          status: 200,
          headers: corsHeaders(),
        })
      }

      if (qStudentId && qTrailId) {
        const authz = requireFacadeAuth(request, qStudentId)
        if (!authz.ok) return respond(authz.status, authz.body)

        const snap = await getStudentTrailByComposite(
          db,
          collection,
          qStudentId,
          qTrailId,
        )
        if (!snap.exists) return respond(404, { error: 'Not found' })
        const data = (snap.data() ?? {}) as Record<string, unknown>

        const pos = await getStudentTrailPosition(
          db,
          collection,
          qStudentId,
          qTrailId,
        )
        if (!pos) return respond(404, { error: 'Not found' })

        const body: Json = {
          ...pos,
          started_at: serializeTs(data.started_at),
          completed_at: serializeTs(data.completed_at),
          last_interaction_at: serializeTs(data.last_interaction_at),
          progress_version:
            typeof data.progress_version === 'number' &&
            Number.isFinite(data.progress_version)
              ? data.progress_version
              : (pos.progress_version ?? 0),
          last_channel: parseChannel(data.last_channel),
          last_delivered: serializeLastDelivered(data.last_delivered),
          last_advance_at: serializeTs(data.last_advance_at),
        }
        if (authz.principal.kind !== 'student') {
          body.last_idempotency_key =
            typeof data.last_idempotency_key === 'string'
              ? data.last_idempotency_key
              : null
        }

        return jsonResponse(body, {
          status: 200,
          headers: corsHeaders(),
        })
      }

      return respond(400, {
        error:
          'Informe id, ou (student_id + trail_id) para buscar o progresso.',
      })
    }

    // POST /student_trails/
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
        try {
          const pos = await advanceStudentTrailQuestion(
            db,
            collection,
            targetStudentId,
            targetTrailId,
            {
              channel: 'whatsapp',
              idempotency_key: requestIdempotencyKey ?? undefined,
            },
          )
          return jsonResponse(pos as Json, {
            status: 200,
            headers: corsHeaders(),
          })
        } catch (e) {
          if (isTrailEngineError(e)) {
            return respond(e.httpStatus, { error: e.message })
          }
          throw e
        }
      }

      if (action === 'advance_stage') {
        try {
          const pos = await advanceStudentTrailStage(
            db,
            collection,
            targetStudentId,
            targetTrailId,
            {
              channel: 'whatsapp',
              idempotency_key: requestIdempotencyKey ?? undefined,
            },
          )
          return jsonResponse(pos as Json, {
            status: 200,
            headers: corsHeaders(),
          })
        } catch (e) {
          if (isTrailEngineError(e)) {
            return respond(e.httpStatus, { error: e.message })
          }
          throw e
        }
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

        if (parsedStage === null && parsedQuestion === null) {
          return respond(400, {
            error:
              'Envie ao menos um de: current_stage_number, current_question_number.',
          })
        }

        // RT-M4: bounds vs totais da trilha aplicados no motor (loadTrailTotals /
        // max_stage / max_question). API só valida mínimos; teto no advance().
        try {
          const pos = await updateStudentTrailPosition(
            db,
            targetStudentId,
            targetTrailId,
            {
              ...(parsedStage !== null
                ? { current_stage_number: parsedStage }
                : {}),
              ...(parsedQuestion !== null
                ? { current_question_number: parsedQuestion }
                : {}),
            },
            { channel: 'whatsapp', idempotency_key: requestIdempotencyKey ?? undefined },
          )
          return jsonResponse(
            {
              ok: true,
              current_stage_number: pos.current_stage_number,
              current_question_number: pos.current_question_number,
              progress_version: pos.progress_version ?? 0,
            },
            {
              status: 200,
              headers: corsHeaders(),
            },
          )
        } catch (e) {
          if (isTrailEngineError(e)) {
            return respond(e.httpStatus, { error: e.message })
          }
          throw e
        }
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

