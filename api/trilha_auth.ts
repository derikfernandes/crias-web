/**
 * Auth aluno Trilha — login por telefone → sessão HMAC (Wave B).
 *
 * U1 / RT-H4 residual (v1): **sem OTP**. Qualquer telefone cadastrado activo
 * obtém sessão. Mitigações v1: Trusted Sources / rede privada, rate-limit na
 * edge (ops), respostas de erro uniformes (RT-H3). OTP/magic-link = follow-up.
 *
 * POST { phone_number } → { token, student }
 * GET  Authorization: Bearer <session> → { student }
 */

import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

import {
  issueStudentSessionToken,
  resolveAuthPrincipal,
  verifyStudentSessionToken,
} from '../server/lib/studentAuth'
import {
  isTrailEngineError,
  resolveStudentByPhone,
} from '../server/lib/trail-engine'

type Json = Record<string, unknown>

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, Idempotency-Key, X-Request-Id',
  }
}

function respond(status: number, body: Json): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(),
    },
  })
}

/** RT-H3: resposta uniforme — sem oráculo 404/409 nem student_id. */
function loginDenied(): Response {
  return respond(401, {
    status: 'error',
    code: 'unauthorized',
    error: 'Não foi possível entrar com este telefone.',
  })
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
    initializeApp({ credential: cert(serviceAccount) })
  }
  cachedDb = getFirestore()
  return cachedDb
}

function sanitizePhone(v: unknown): string | null {
  const s =
    typeof v === 'string' || typeof v === 'number' ? String(v) : null
  if (!s) return null
  const digits = s.replace(/\D/g, '')
  return digits.length ? digits : null
}

async function handleRequest(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  let db: ReturnType<typeof getFirestore>
  try {
    db = getDb()
  } catch (e) {
    return respond(500, {
      status: 'error',
      code: 'server_misconfigured',
      error: e instanceof Error ? e.message : 'Firebase Admin indisponível.',
    })
  }

  // GET /api/trilha_auth — sessão atual
  if (request.method === 'GET') {
    const principal = resolveAuthPrincipal(request.headers.get('Authorization'))
    if (principal.kind !== 'student') {
      return respond(401, {
        status: 'error',
        code: 'unauthorized',
        error: 'Sessão aluno inválida ou ausente.',
      })
    }
    return respond(200, {
      status: 'ok',
      student: {
        student_id: principal.claims.student_id,
        institution_id: principal.claims.institution_id,
        name: principal.claims.name,
        phone_number: principal.claims.phone_number,
        exp: principal.claims.exp,
      },
    })
  }

  // POST /api/trilha_auth — login telefone (sem OTP — residual U1/RT-H4)
  if (request.method === 'POST') {
    let payload: unknown
    try {
      payload = await request.json()
    } catch {
      payload = {}
    }
    const body = (payload ?? {}) as Record<string, unknown>
    const phone =
      sanitizePhone(body.phone_number) ??
      sanitizePhone(body.phone) ??
      null

    if (!phone) {
      return respond(400, {
        status: 'error',
        code: 'invalid_phone',
        error: 'Informe um telefone válido.',
      })
    }

    try {
      const student = await resolveStudentByPhone(db, phone, undefined, {
        requireActive: true,
      })
      let token: string
      let claims
      try {
        ;({ token, claims } = issueStudentSessionToken({
          student_id: student.student_id,
          institution_id: student.institution_id,
          name: student.name,
          phone_number: student.phone_number || phone,
        }))
      } catch (e) {
        return respond(500, {
          status: 'error',
          code: 'session_issue_failed',
          error:
            e instanceof Error ? e.message : 'Falha ao emitir sessão.',
        })
      }

      const verified = verifyStudentSessionToken(token)
      if (!verified) {
        return respond(500, {
          status: 'error',
          code: 'session_issue_failed',
          error: 'Falha ao emitir sessão.',
        })
      }

      return respond(200, {
        status: 'ok',
        token,
        student: {
          student_id: claims.student_id,
          institution_id: claims.institution_id,
          name: claims.name,
          phone_number: claims.phone_number,
          exp: claims.exp,
        },
      })
    } catch (e) {
      // RT-H3: miss / inactivo / inválido → mesma resposta (sem student_id).
      if (isTrailEngineError(e)) {
        if (
          e.code === 'not_found' ||
          e.code === 'inactive_student' ||
          e.code === 'invalid_phone'
        ) {
          return loginDenied()
        }
        return respond(e.httpStatus, {
          status: 'error',
          code: e.code,
          error: e.message,
        })
      }
      throw e
    }
  }

  return respond(405, {
    status: 'error',
    code: 'method_not_allowed',
    error: `Método ${request.method} não permitido`,
  })
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
      // ignore
    }
  })
  const ab = await response.arrayBuffer()
  res.end(Buffer.from(ab))
}
