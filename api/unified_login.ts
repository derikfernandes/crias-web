/**
 * Login unificado por e-mail (Firebase = senha canônica).
 *
 * POST { action: 'roles', institution_id? } + Authorization Bearer <Firebase ID token>
 *   → papéis student/gestao + sessão aluno se houver vínculo em students
 *
 * POST { action: 'ensure_firebase', email, password, institution_id? }
 *   → valida senha do aluno (hash); cria user Firebase se ainda não existir
 *     (não sobrescreve senha se a conta Auth já existe = Educação canônica)
 */

import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

import { identifyStudent } from '../server/lib/studentTrailProgressService'
import {
  ensureFirebaseUserForEmail,
  resolveUnifiedRoles,
} from '../server/lib/unifiedEmailAuth'

type Json = Record<string, unknown>

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
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

function extractBearer(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null
  const m = authorizationHeader.match(/^Bearer\s+(.+)$/i)
  if (!m?.[1]) return null
  const t = m[1].trim()
  return t.length ? t : null
}

function looksLikeEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
}

async function handleRoles(
  db: ReturnType<typeof getFirestore>,
  request: Request,
  body: Record<string, unknown>,
): Promise<Response> {
  const bearer = extractBearer(request.headers.get('Authorization'))
  if (!bearer) {
    return respond(401, {
      status: 'error',
      code: 'unauthorized',
      error: 'Autenticação necessária.',
    })
  }

  let email = ''
  try {
    const decoded = await getAuth().verifyIdToken(bearer)
    email =
      typeof decoded.email === 'string' ? decoded.email.trim().toLowerCase() : ''
  } catch {
    return respond(401, {
      status: 'error',
      code: 'unauthorized',
      error: 'Token inválido ou expirado.',
    })
  }
  if (!email) {
    return respond(403, {
      status: 'error',
      code: 'forbidden',
      error: 'Conta sem e-mail.',
    })
  }

  const institutionId =
    typeof body.institution_id === 'string' ? body.institution_id.trim() : null

  const roles = await resolveUnifiedRoles(db, email, {
    institutionId,
  })

  if (roles.status === 'needs_institution') {
    return respond(200, roles as unknown as Json)
  }

  if (!roles.roles.student && !roles.roles.gestao) {
    return respond(403, {
      status: 'error',
      code: 'no_roles',
      error: 'Sem acesso de aluno nem de Educação para este e-mail.',
    })
  }

  return respond(200, {
    status: 'ok',
    email: roles.email,
    roles: roles.roles,
    student: roles.student
      ? {
          status: 'ok',
          student_id: roles.student.student_id,
          institution_id: roles.student.institution_id,
          name: roles.student.name,
          active: true,
          phone_number: roles.student.phone_number,
        }
      : null,
  })
}

async function handleEnsureFirebase(
  db: ReturnType<typeof getFirestore>,
  body: Record<string, unknown>,
): Promise<Response> {
  const email =
    typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const institutionId =
    typeof body.institution_id === 'string' ? body.institution_id.trim() : undefined

  if (!looksLikeEmail(email) || !password.trim()) {
    return respond(400, {
      status: 'error',
      code: 'invalid_payload',
      error: 'E-mail e senha são obrigatórios.',
    })
  }

  // Só migra quem prova a senha do aluno (hash). Não confia no client.
  const identified = await identifyStudent(db, {
    login: email,
    password,
    institution_id: institutionId,
  })
  if (!identified.ok) {
    return respond(identified.httpStatus ?? 401, {
      status: 'error',
      code: identified.code,
      error: identified.message,
    })
  }

  if (identified.data.status === 'needs_institution') {
    return respond(200, {
      status: 'needs_institution',
      institutions: identified.data.institutions,
    })
  }

  const student = identified.data
  const ensured = await ensureFirebaseUserForEmail(email, password)
  if (ensured.status === 'error') {
    return respond(500, {
      status: 'error',
      code: ensured.code,
      error: ensured.error,
    })
  }

  if (ensured.status === 'already_exists') {
    // Conta Auth já existe (senha canônica Educação). Não autentica com hash do aluno.
    return respond(401, {
      status: 'error',
      code: 'use_firebase_password',
      error: 'Não foi possível entrar. Confira os dados.',
    })
  }

  return respond(200, {
    status: 'ok',
    firebase: 'created',
    student: {
      status: 'ok',
      student_id: student.student_id,
      institution_id: student.institution_id,
      name: student.name,
      active: true,
      phone_number: student.phone_number,
    },
  })
}

async function handleRequest(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  if (request.method !== 'POST') {
    return respond(405, {
      status: 'error',
      code: 'method_not_allowed',
      error: 'Use POST.',
    })
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

  let body: Record<string, unknown> = {}
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    body = {}
  }

  const action =
    typeof body.action === 'string' ? body.action.trim() : 'roles'

  try {
    if (action === 'roles') return await handleRoles(db, request, body)
    if (action === 'ensure_firebase') return await handleEnsureFirebase(db, body)
    return respond(400, {
      status: 'error',
      code: 'invalid_action',
      error: 'action inválida. Use roles ou ensure_firebase.',
    })
  } catch (e) {
    return respond(500, {
      status: 'error',
      code: 'internal_error',
      error: e instanceof Error ? e.message : 'Erro interno.',
    })
  }
}

export default {
  fetch: handleRequest,
}
