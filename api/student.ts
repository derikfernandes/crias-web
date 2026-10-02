import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

import {
  resolveStudentByPhoneSoft,
  toCanonicalPhone,
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
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

function serializeTs(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'object' && value && 'toDate' in value) {
    try {
      // firebase-admin Timestamp
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

function sanitizePhoneNumber(v: unknown): string | null {
  // Mantém somente dígitos; rejeita se virar string vazia.
  const s =
    typeof v === 'string' || typeof v === 'number' ? String(v) : null
  if (!s) return null
  const digits = s.replace(/\D/g, '')
  return digits.length ? digits : null
}

function parseBoolean(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v
  if (typeof v !== 'string') return null
  const s = v.trim().toLowerCase()
  if (['1', 'true', 'yes', 'sim'].includes(s)) return true
  if (['0', 'false', 'no', 'nao', 'não'].includes(s)) return false
  return null
}

function normalizeSchoolLevel(v: string): string {
  const s = v.trim().toLowerCase()
  if (s === 'fundamental') return 'fundamental'
  if (s === 'medio' || s === 'médio') return 'médio'
  return s
}

async function deleteByStudentId(
  db: ReturnType<typeof getFirestore>,
  collectionName: string,
  studentId: string,
): Promise<number> {
  let total = 0
  const batchSize = 400

  while (true) {
    const snap = await db
      .collection(collectionName)
      .where('student_id', '==', studentId)
      .limit(batchSize)
      .get()
    if (snap.empty) break

    const batch = db.batch()
    for (const d of snap.docs) batch.delete(d.ref)
    await batch.commit()
    total += snap.size
  }

  return total
}

function validateStudentLevel(v: unknown): 1 | 2 | 3 | null {
  if (typeof v === 'number' && Number.isFinite(v)) {
    if (v === 1 || v === 2 || v === 3) return v
    return null
  }
  if (typeof v === 'string') {
    const n = Number.parseInt(v, 10)
    if (Number.isFinite(n) && (n === 1 || n === 2 || n === 3)) return n as 1 | 2 | 3
  }
  return null
}

function toStudentOutput(data: Record<string, unknown>, id: string): Json {
  return {
    id,
    institution_id: typeof data.institution_id === 'string' ? data.institution_id : '',
    name: typeof data.name === 'string' ? data.name : '',
    phone_number:
      typeof data.phone_number === 'string'
        ? data.phone_number.replace(/\D/g, '')
        : typeof data.phone_number === 'number'
          ? String(data.phone_number).replace(/\D/g, '')
          : '',
    school_level:
      typeof data.school_level === 'string' ? data.school_level : '',
    school_grade:
      typeof data.school_grade === 'string' ? data.school_grade : '',
    student_level:
      typeof data.student_level === 'number' && (data.student_level === 1 || data.student_level === 2 || data.student_level === 3)
        ? data.student_level
        : 2,
    active: typeof data.active === 'boolean' ? data.active : false,
    created_at: serializeTs(data.created_at),
    updated_at: serializeTs(data.updated_at),
  }
}

function studentOutputFromSnap(snap: { exists: boolean; id: string; data: () => unknown }): Json {
  const data = (snap.data() ?? {}) as Record<string, unknown>
  return toStudentOutput(data, snap.id)
}

async function handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')?.trim()
    const simple = url.searchParams.get('simple') === '1'

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

    const collection = process.env.STUDENTS_COLLECTION ?? 'students'

    const respond = (status: number, body: Json): Response => {
      return new Response(JSON.stringify(body), {
        status,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...corsHeaders(),
        },
      })
    }

    // RT-H2/H3: API student exige service Bearer (lista/PII/phone).
    try {
      assertServiceBearer(request.headers)
    } catch (e) {
      if (isTrailEngineError(e)) {
        return respond(e.httpStatus, trailEngineErrorToJson(e) as Json)
      }
      throw e
    }

    const q = url.searchParams
    const qInstitutionId = q.get('institution_id')?.trim() || null
    const qSchoolLevel = sanitizeString(q.get('school_level'))
    const qSchoolGrade = sanitizeString(q.get('school_grade'))
    const qStudentLevel = validateStudentLevel(q.get('student_level'))
    const qActive = parseBoolean(q.get('active'))
    const rawPhoneNumber = q.get('phone_number')?.trim() || null
    const qPhoneNumber = rawPhoneNumber ? sanitizePhoneNumber(rawPhoneNumber) : null

    try {
      // GET /student/
      // GET /student/simple
      // GET /student/:id (via ?id=:id)
      if (request.method === 'GET') {
        if (id) {
          const snap = await db.collection(collection).doc(id).get()
          if (!snap.exists) return respond(404, { error: 'Not found' })

          const data = snap.data() ?? {}
          const out = toStudentOutput(data as Record<string, unknown>, snap.id)
          if (simple) {
            return jsonResponse(
              {
                id: out.id,
                institution_id: out.institution_id,
                name: out.name,
                school_level: out.school_level,
                school_grade: out.school_grade,
                student_level: out.student_level,
                active: out.active,
              },
              { status: 200, headers: corsHeaders() },
            )
          }

          return jsonResponse(out, { status: 200, headers: corsHeaders() })
        }

        // GET /student/{phone_number} (via ?phone_number=:phone_number)
        // Lookup com variantes (55… ↔ local) — não-destrutivo (I6).
        if (rawPhoneNumber && !qPhoneNumber) {
          return respond(400, { error: 'phone_number inválido (sem dígitos)' })
        }
        if (qPhoneNumber) {
          const resolved = await resolveStudentByPhoneSoft(db, qPhoneNumber)
          if (!resolved) return respond(200, {})

          const snap = await db.collection(collection).doc(resolved.student_id).get()
          if (!snap.exists) return respond(200, {})

          const out = toStudentOutput(
            snap.data() ?? {},
            snap.id,
          )

          if (simple) {
            return jsonResponse(
              {
                id: out.id,
                institution_id: out.institution_id,
                name: out.name,
                school_level: out.school_level,
                school_grade: out.school_grade,
                student_level: out.student_level,
                active: out.active,
              },
              { status: 200, headers: corsHeaders() },
            )
          }

          return jsonResponse(out, { status: 200, headers: corsHeaders() })
        }

        const snap = await db.collection(collection).get()
        const all = snap.docs.map((d) =>
          toStudentOutput((d.data() ?? {}) as Record<string, unknown>, d.id),
        )

        const filtered = all.filter((item) => {
          const instOk =
            qInstitutionId ? item.institution_id === qInstitutionId : true
          if (!instOk) return false

          const activeOk = qActive === null ? true : item.active === qActive
          if (!activeOk) return false

          const levelOk = qSchoolLevel
            ? (typeof item.school_level === 'string' &&
                normalizeSchoolLevel(item.school_level) ===
                  normalizeSchoolLevel(qSchoolLevel))
            : true
          if (!levelOk) return false

          const gradeOk = qSchoolGrade
            ? item.school_grade === qSchoolGrade
            : true
          if (!gradeOk) return false

          const studentLevelOk = qStudentLevel
            ? item.student_level === qStudentLevel
            : true
          if (!studentLevelOk) return false

          return true
        })

        const reduced = simple
          ? filtered.map((item) => ({
              id: item.id,
              institution_id: item.institution_id,
              name: item.name,
              school_level: item.school_level,
              school_grade: item.school_grade,
              student_level: item.student_level,
              active: item.active,
            }))
          : filtered

        return jsonResponse(reduced as Json[], {
          status: 200,
          headers: corsHeaders(),
        })
      }

      // POST /student/
      if (request.method === 'POST') {
        if (id) return respond(400, { error: 'id não deve ser enviado em POST' })

        let payload: unknown
        try {
          payload = await request.json()
        } catch {
          return respond(400, { error: 'JSON inválido' })
        }

        if (!payload || typeof payload !== 'object') {
          return respond(400, { error: 'Payload inválido' })
        }

        const body = payload as Json

        const institution_id = sanitizeString(body.institution_id)
        const name = sanitizeString(body.name)
        const phone_number = sanitizePhoneNumber(body.phone_number)
        // Escrita nova: preferir canónico BR 55… quando válido; senão dígitos sanitizados.
        const canonical = phone_number ? toCanonicalPhone(phone_number) : null
        const phoneToStore =
          canonical && canonical.ok ? canonical.canonical : phone_number
        const school_level = sanitizeString(body.school_level)
        const school_grade = sanitizeString(body.school_grade)

        if (!institution_id)
          return respond(400, { error: 'Campo "institution_id" é obrigatório' })
        if (!name)
          return respond(400, { error: 'Campo "name" é obrigatório' })
        if (!phone_number)
          return respond(400, { error: 'Campo "phone_number" é obrigatório' })
        if (!school_level)
          return respond(400, { error: 'Campo "school_level" é obrigatório' })
        if (!school_grade)
          return respond(400, { error: 'Campo "school_grade" é obrigatório' })

        const normalizedSchoolLevel = normalizeSchoolLevel(school_level)
        if (!['fundamental', 'médio'].includes(normalizedSchoolLevel)) {
          return respond(400, {
            error:
              'Campo "school_level" inválido. Use "fundamental" ou "médio".',
          })
        }

        const studentLevel =
          validateStudentLevel(body.student_level) ?? 2 // default intermediário

        const active = typeof body.active === 'boolean' ? body.active : true

        const now = FieldValue.serverTimestamp()

        // IDs sequenciais: s1, s2, s3...
        // Mantém um contador em counters/students { next: number } e incrementa via transação.
        const counterRef = db.collection('counters').doc('students')

        const newId = await db.runTransaction(async (tx) => {
          const counterSnap = await tx.get(counterRef)
          const counterData = counterSnap.data() ?? {}
          const rawNext = (counterData as { next?: unknown }).next

          const next =
            typeof rawNext === 'number' && Number.isFinite(rawNext) && rawNext >= 1
              ? Math.floor(rawNext)
              : 1

          const studentId = `s${next}`
          const studentRef = db.collection(collection).doc(studentId)

          const existing = await tx.get(studentRef)
          if (existing.exists) {
            throw new Error(
              `Conflito ao gerar id sequencial (${studentId}). Verifique counters/students.next.`,
            )
          }

          tx.set(studentRef, {
            institution_id,
            name,
            phone_number: phoneToStore,
            school_level: normalizedSchoolLevel,
            school_grade,
            student_level: studentLevel,
            active,
            created_at: now,
            updated_at: now,
          })

          tx.set(counterRef, { next: next + 1 }, { merge: true })

          return studentId
        })

        return jsonResponse(
          {
            id: newId,
            institution_id,
            name,
            phone_number: phoneToStore,
            school_level: normalizedSchoolLevel,
            school_grade,
            student_level: studentLevel,
            active,
            created_at: null,
            updated_at: null,
          },
          { status: 201, headers: corsHeaders() },
        )
      }

      // PUT /student/:id (via ?id=:id)
      if (request.method === 'PUT') {
        if (!id) return respond(400, { error: 'id é obrigatório em PUT' })

        let payload: unknown
        try {
          payload = await request.json()
        } catch {
          return respond(400, { error: 'JSON inválido' })
        }

        if (!payload || typeof payload !== 'object') {
          return respond(400, { error: 'Payload inválido' })
        }

        const body = payload as Json
        const updates: Json = {}

        const institution_id = sanitizeString(body.institution_id)
        if (institution_id) updates.institution_id = institution_id

        const name = sanitizeString(body.name)
        if (name) updates.name = name

        if ('phone_number' in body && body.phone_number !== undefined) {
          const sanitizedPhone = sanitizePhoneNumber(body.phone_number)
          if (!sanitizedPhone) {
            return respond(400, {
              error:
                'Campo "phone_number" inválido. Informe apenas números (o backend remove caracteres não numéricos).',
            })
          }
          const canonical = toCanonicalPhone(sanitizedPhone)
          updates.phone_number = canonical.ok
            ? canonical.canonical
            : sanitizedPhone
        }

        const school_level = sanitizeString(body.school_level)
        if (school_level) {
          const normalized = normalizeSchoolLevel(school_level)
          if (!['fundamental', 'médio'].includes(normalized)) {
            return respond(400, {
              error:
                'Campo "school_level" inválido. Use "fundamental" ou "médio".',
            })
          }
          updates.school_level = normalized
        }

        const school_grade = sanitizeString(body.school_grade)
        if (school_grade) updates.school_grade = school_grade

        if ('student_level' in body && body.student_level !== undefined) {
          const studentLevel = validateStudentLevel(body.student_level)
          if (!studentLevel) {
            return respond(400, {
              error: 'Campo "student_level" inválido. Use 1, 2 ou 3.',
            })
          }
          updates.student_level = studentLevel
        }

        if (typeof body.active === 'boolean') updates.active = body.active

        updates.updated_at = FieldValue.serverTimestamp()

        const ref = db.collection(collection).doc(id)
        const snap = await ref.get()
        if (!snap.exists) return respond(404, { error: 'Not found' })

        await ref.update(updates)
        return jsonResponse({ ok: true, id }, { status: 200, headers: corsHeaders() })
      }

      // DELETE /student/:id (via ?id=:id)
      // Cascade: student_trails → conversation_logs → exercise_attempts → students
      if (request.method === 'DELETE') {
        if (!id) return respond(400, { error: 'id é obrigatório em DELETE' })

        const studentTrailsCollection =
          process.env.STUDENT_TRAILS_COLLECTION ?? 'student_trails'
        const conversationLogsCollection =
          process.env.CONVERSATION_LOGS_COLLECTION ?? 'conversation_logs'
        const exerciseAttemptsCollection =
          process.env.EXERCISE_ATTEMPTS_COLLECTION ?? 'exercise_attempts'

        const deletedStudentTrails = await deleteByStudentId(
          db,
          studentTrailsCollection,
          id,
        )
        const deletedConversationLogs = await deleteByStudentId(
          db,
          conversationLogsCollection,
          id,
        )
        const deletedExerciseAttempts = await deleteByStudentId(
          db,
          exerciseAttemptsCollection,
          id,
        )

        const ref = db.collection(collection).doc(id)
        const snap = await ref.get()
        const deletedStudent = snap.exists
        if (deletedStudent) {
          await ref.delete()
        }

        console.info('[student.delete_cascade]', {
          student_id: id,
          deleted_student: deletedStudent,
          deleted_student_trails: deletedStudentTrails,
          deleted_conversation_logs: deletedConversationLogs,
          deleted_exercise_attempts: deletedExerciseAttempts,
        })

        return new Response(null, { status: 204, headers: corsHeaders() })
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

