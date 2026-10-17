/**
 * Acesso Master (revelar/gerar/exportar senhas de alunos).
 * Configurável via:
 * - env `MASTER_ADMIN_EMAILS` (lista CSV de e-mails)
 * - campo Firestore `admin_users.is_master === true`
 * Nunca hardcode nomes/e-mails de pessoas no código.
 */

import { getAuth } from 'firebase-admin/auth'
import type { Firestore } from 'firebase-admin/firestore'

export type MasterPrincipal = {
  email: string
  uid: string
}

export type MasterAuthFailure = {
  ok: false
  status: 401 | 403 | 500
  code: string
  error: string
}

export type MasterAuthSuccess = {
  ok: true
  principal: MasterPrincipal
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** E-mails Master a partir do env (CSV). */
export function parseMasterAdminEmails(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const raw = env.MASTER_ADMIN_EMAILS?.trim()
  if (!raw) return []
  return raw
    .split(',')
    .map((e) => normalizeEmail(e))
    .filter(Boolean)
}

export function isEmailInMasterEnvList(
  email: string,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const list = parseMasterAdminEmails(env)
  if (list.length === 0) return false
  return list.includes(normalizeEmail(email))
}

export async function isMasterInFirestore(
  db: Firestore,
  email: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<boolean> {
  const collection = env.ADMIN_USERS_COLLECTION?.trim() || 'admin_users'
  const normalized = normalizeEmail(email)
  const snap = await db
    .collection(collection)
    .where('email', '==', normalized)
    .limit(1)
    .get()
  if (snap.empty) return false
  const data = snap.docs[0]?.data() ?? {}
  if (data.active === false) return false
  return data.is_master === true
}

export async function isMasterEmail(
  db: Firestore,
  email: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<boolean> {
  if (isEmailInMasterEnvList(email, env)) return true
  return isMasterInFirestore(db, email, env)
}

function extractBearer(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null
  const m = authorizationHeader.match(/^Bearer\s+(.+)$/i)
  if (!m?.[1]) return null
  const t = m[1].trim()
  return t.length ? t : null
}

/**
 * Verifica Firebase ID token da gestão admin e exige papel Master.
 */
export async function requireMasterFromRequest(
  db: Firestore,
  authorizationHeader: string | null,
  env: NodeJS.ProcessEnv = process.env,
): Promise<MasterAuthSuccess | MasterAuthFailure> {
  const bearer = extractBearer(authorizationHeader)
  if (!bearer) {
    return {
      ok: false,
      status: 401,
      code: 'unauthorized',
      error: 'Autenticação necessária (Bearer Firebase ID token).',
    }
  }

  let decoded: { email?: string; uid: string }
  try {
    decoded = await getAuth().verifyIdToken(bearer)
  } catch {
    return {
      ok: false,
      status: 401,
      code: 'unauthorized',
      error: 'Token inválido ou expirado.',
    }
  }

  const email =
    typeof decoded.email === 'string' ? normalizeEmail(decoded.email) : ''
  if (!email) {
    return {
      ok: false,
      status: 403,
      code: 'forbidden',
      error: 'Conta sem e-mail; acesso Master negado.',
    }
  }

  let master = false
  try {
    master = await isMasterEmail(db, email, env)
  } catch (e) {
    return {
      ok: false,
      status: 500,
      code: 'internal_error',
      error:
        e instanceof Error
          ? e.message
          : 'Falha ao verificar papel Master.',
    }
  }

  if (!master) {
    return {
      ok: false,
      status: 403,
      code: 'forbidden',
      error: 'Acesso restrito a Master.',
    }
  }

  return {
    ok: true,
    principal: { email, uid: decoded.uid },
  }
}
