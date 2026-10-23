/**
 * Autenticação das APIs da Gestão: Bearer Firebase ID token + escopo
 * de instituição (Master/super/`all_institutions`/sem perfil legado vê
 * todas; escola só a sua). Espelha `adminPermissions` do client.
 */

import { getAuth } from 'firebase-admin/auth'
import type { Firestore } from 'firebase-admin/firestore'

import { isMasterEmail } from './masterAuth.js'

export type GestaoAdminPrincipal = {
  email: string
  uid: string
  isMaster: boolean
  /**
   * `null` = acesso a todas as instituições (Master, super admin ou
   * all_institutions). Caso contrário, lista permitida.
   */
  allowedInstitutionIds: string[] | null
}

export type GestaoAdminAuthFailure = {
  ok: false
  status: 401 | 403 | 500
  code: string
  error: string
}

export type GestaoAdminAuthSuccess = {
  ok: true
  principal: GestaoAdminPrincipal
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function extractBearer(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null
  const m = authorizationHeader.match(/^Bearer\s+(.+)$/i)
  if (!m?.[1]) return null
  const t = m[1].trim()
  return t.length ? t : null
}

type AdminUserRow = {
  active: boolean
  is_master: boolean
  is_super_admin: boolean
  all_institutions: boolean
  institution_ids: string[]
}

export async function loadAdminUserByEmail(
  db: Firestore,
  email: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<AdminUserRow | null> {
  const collection = env.ADMIN_USERS_COLLECTION?.trim() || 'admin_users'
  const normalized = normalizeEmail(email)
  const snap = await db
    .collection(collection)
    .where('email', '==', normalized)
    .limit(1)
    .get()
  if (snap.empty) return null
  const data = snap.docs[0]?.data() ?? {}
  const idsRaw = data.institution_ids
  const institution_ids = Array.isArray(idsRaw)
    ? idsRaw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    : []
  return {
    active: data.active !== false,
    is_master: data.is_master === true,
    is_super_admin: data.is_super_admin === true,
    all_institutions: data.all_institutions === true,
    institution_ids,
  }
}

/**
 * Verifica Firebase ID token e resolve o escopo de instituições do admin.
 * Sem token / token inválido → 401.
 * Sem papel de Gestão → 403.
 */
export async function requireGestaoAdminFromRequest(
  db: Firestore,
  authorizationHeader: string | null,
  env: NodeJS.ProcessEnv = process.env,
): Promise<GestaoAdminAuthSuccess | GestaoAdminAuthFailure> {
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
      error: 'Conta sem e-mail; acesso à Gestão negado.',
    }
  }

  let master = false
  let profile: AdminUserRow | null = null
  try {
    master = await isMasterEmail(db, email, env)
    profile = await loadAdminUserByEmail(db, email, env)
  } catch (e) {
    return {
      ok: false,
      status: 500,
      code: 'internal_error',
      error:
        e instanceof Error
          ? e.message
          : 'Falha ao verificar acesso da Gestão.',
    }
  }

  if (master) {
    return {
      ok: true,
      principal: {
        email,
        uid: decoded.uid,
        isMaster: true,
        allowedInstitutionIds: null,
      },
    }
  }

  /**
   * Espelha `adminPermissions` no client: sem registro em `admin_users`
   * = acesso total (compatibilidade legada). Continua exigindo login
   * Firebase válido (401 sem token).
   */
  if (!profile) {
    return {
      ok: true,
      principal: {
        email,
        uid: decoded.uid,
        isMaster: false,
        allowedInstitutionIds: null,
      },
    }
  }

  if (!profile.active) {
    return {
      ok: false,
      status: 403,
      code: 'forbidden',
      error: 'Conta de administrador desativada.',
    }
  }

  if (profile.is_super_admin || profile.all_institutions) {
    return {
      ok: true,
      principal: {
        email,
        uid: decoded.uid,
        isMaster: profile.is_master,
        allowedInstitutionIds: null,
      },
    }
  }

  if (profile.institution_ids.length === 0) {
    return {
      ok: false,
      status: 403,
      code: 'forbidden',
      error: 'Nenhuma instituição liberada para este usuário.',
    }
  }

  return {
    ok: true,
    principal: {
      email,
      uid: decoded.uid,
      isMaster: profile.is_master,
      allowedInstitutionIds: profile.institution_ids,
    },
  }
}

/** Master / super: todas. Escola: só as liberadas. */
export function canAccessInstitution(
  principal: GestaoAdminPrincipal,
  institutionId: string,
): boolean {
  const id = institutionId.trim()
  if (!id) return false
  if (principal.allowedInstitutionIds === null) return true
  return principal.allowedInstitutionIds.includes(id)
}

export function filterInstitutionsByAccess<T extends { id: string }>(
  principal: GestaoAdminPrincipal,
  items: T[],
): T[] {
  if (principal.allowedInstitutionIds === null) return items
  const allowed = new Set(principal.allowedInstitutionIds)
  return items.filter((item) => allowed.has(item.id))
}
