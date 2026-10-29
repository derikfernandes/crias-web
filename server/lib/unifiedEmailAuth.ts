/**
 * Unificação de login por e-mail (opção A):
 * - Senha canônica = Firebase (Educação)
 * - Papéis por vínculo: students (e-mail) e admin_users / Master
 * - Telefone / id do aluno: fora deste módulo (identifyStudent + hash)
 */

import { getAuth } from 'firebase-admin/auth'
import type { Firestore } from 'firebase-admin/firestore'

import { loadAdminUserByEmail } from './gestaoAdminAuth.js'
import { isMasterEmail } from './masterAuth.js'

export type UnifiedStudentHit = {
  student_id: string
  institution_id: string
  name: string
  phone_number: string
  institution_name: string
}

export type UnifiedRolesOk = {
  status: 'ok'
  email: string
  roles: { student: boolean; gestao: boolean }
  student: UnifiedStudentHit | null
}

export type UnifiedRolesNeedsInstitution = {
  status: 'needs_institution'
  email: string
  roles: { student: true; gestao: boolean }
  institutions: Array<{
    institution_id: string
    institution_name: string
    student_id: string
  }>
}

export type UnifiedRolesResult = UnifiedRolesOk | UnifiedRolesNeedsInstitution

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function digitsOnly(v: unknown): string {
  if (typeof v === 'number') return String(v).replace(/\D/g, '')
  if (typeof v === 'string') return v.replace(/\D/g, '')
  return ''
}

async function institutionName(
  db: Firestore,
  institutionId: string,
  env: NodeJS.ProcessEnv,
): Promise<string> {
  const col = env.INSTITUTIONS_COLLECTION?.trim() || 'institutions'
  try {
    const snap = await db.collection(col).doc(institutionId).get()
    if (!snap.exists) return institutionId
    const name = (snap.data() as { name?: unknown } | undefined)?.name
    return typeof name === 'string' && name.trim() ? name.trim() : institutionId
  } catch {
    return institutionId
  }
}

/** Alunos ativos com este e-mail (pode ser multi-escola). */
export async function findStudentsByEmail(
  db: Firestore,
  email: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<UnifiedStudentHit[]> {
  const studentsCol = env.STUDENTS_COLLECTION?.trim() || 'students'
  const normalized = normalizeEmail(email)
  if (!normalized.includes('@')) return []

  const snap = await db
    .collection(studentsCol)
    .where('email', '==', normalized)
    .limit(20)
    .get()

  const out: UnifiedStudentHit[] = []
  for (const doc of snap.docs) {
    const data = (doc.data() ?? {}) as Record<string, unknown>
    if (data.active === false) continue
    const institution_id =
      typeof data.institution_id === 'string' ? data.institution_id.trim() : ''
    if (!institution_id) continue
    const institution_name = await institutionName(db, institution_id, env)
    out.push({
      student_id: doc.id,
      institution_id,
      name: typeof data.name === 'string' ? data.name : '',
      phone_number: digitsOnly(data.phone_number),
      institution_name,
    })
  }
  return out
}

/** Gestor = Master (env/Firestore) ou admin_users ativo. */
export async function emailHasGestaoRole(
  db: Firestore,
  email: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<boolean> {
  if (await isMasterEmail(db, email, env)) return true
  const profile = await loadAdminUserByEmail(db, email, env)
  return Boolean(profile && profile.active)
}

/**
 * Resolve papéis após Firebase Auth ok.
 * `institutionId` desambigua multi-escola do aluno.
 */
export async function resolveUnifiedRoles(
  db: Firestore,
  email: string,
  opts: { institutionId?: string | null } = {},
  env: NodeJS.ProcessEnv = process.env,
): Promise<UnifiedRolesResult> {
  const normalized = normalizeEmail(email)
  const students = await findStudentsByEmail(db, normalized, env)
  const gestao = await emailHasGestaoRole(db, normalized, env)
  const institutionFilter = opts.institutionId?.trim() || ''

  let filtered = students
  if (institutionFilter) {
    filtered = students.filter((s) => s.institution_id === institutionFilter)
  }

  if (filtered.length > 1 && !institutionFilter) {
    return {
      status: 'needs_institution',
      email: normalized,
      roles: { student: true, gestao },
      institutions: filtered.map((s) => ({
        institution_id: s.institution_id,
        institution_name: s.institution_name,
        student_id: s.student_id,
      })),
    }
  }

  const student = filtered[0] ?? null
  return {
    status: 'ok',
    email: normalized,
    roles: {
      student: Boolean(student),
      gestao,
    },
    student,
  }
}

export type EnsureFirebaseResult =
  | { status: 'created'; uid: string }
  | { status: 'already_exists'; uid: string }
  | { status: 'error'; code: string; error: string }

/**
 * Cria user Firebase para aluno com e-mail ainda sem conta Auth.
 * Se já existe (senha canônica Educação), NÃO altera a senha.
 */
export async function ensureFirebaseUserForEmail(
  email: string,
  password: string,
): Promise<EnsureFirebaseResult> {
  const normalized = normalizeEmail(email)
  const auth = getAuth()
  try {
    const existing = await auth.getUserByEmail(normalized)
    return { status: 'already_exists', uid: existing.uid }
  } catch (e: unknown) {
    const code =
      e && typeof e === 'object' && 'code' in e
        ? String((e as { code: unknown }).code)
        : ''
    if (code !== 'auth/user-not-found') {
      return {
        status: 'error',
        code: code || 'firebase_lookup_failed',
        error: 'Não foi possível verificar a conta.',
      }
    }
  }

  try {
    const created = await auth.createUser({
      email: normalized,
      password,
      emailVerified: true,
    })
    return { status: 'created', uid: created.uid }
  } catch (e: unknown) {
    const code =
      e && typeof e === 'object' && 'code' in e
        ? String((e as { code: unknown }).code)
        : ''
    // Corrida: outro request criou entre get e create.
    if (code === 'auth/email-already-exists') {
      try {
        const existing = await auth.getUserByEmail(normalized)
        return { status: 'already_exists', uid: existing.uid }
      } catch {
        /* fall through */
      }
    }
    return {
      status: 'error',
      code: code || 'firebase_create_failed',
      error: 'Não foi possível criar a conta de e-mail.',
    }
  }
}
