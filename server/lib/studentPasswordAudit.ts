import { FieldValue, type Firestore } from 'firebase-admin/firestore'

export type StudentPasswordAuditAction =
  | 'view_list'
  | 'export_csv'
  | 'regenerate'
  | 'bulk_generate'
  | 'bulk_import'

export type StudentPasswordAuditInput = {
  actor_email: string
  actor_uid: string
  action: StudentPasswordAuditAction
  institution_id?: string | null
  student_id?: string | null
  student_ids?: string[] | null
  meta?: Record<string, unknown> | null
}

/**
 * Auditoria de acesso a senhas (Master).
 * Nunca grava plaintext de senha.
 */
export async function writeStudentPasswordAudit(
  db: Firestore,
  input: StudentPasswordAuditInput,
  env: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  const collection =
    env.STUDENT_PASSWORD_AUDIT_COLLECTION?.trim() ||
    'student_password_audit'

  const payload: Record<string, unknown> = {
    actor_email: input.actor_email.trim().toLowerCase(),
    actor_uid: input.actor_uid,
    action: input.action,
    created_at: FieldValue.serverTimestamp(),
  }
  if (input.institution_id) payload.institution_id = input.institution_id
  if (input.student_id) payload.student_id = input.student_id
  if (input.student_ids && input.student_ids.length > 0) {
    payload.student_ids = input.student_ids.slice(0, 500)
    payload.student_count = input.student_ids.length
  }
  if (input.meta && Object.keys(input.meta).length > 0) {
    // Strip any accidental password-like keys.
    const safe: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(input.meta)) {
      const key = k.toLowerCase()
      if (
        key.includes('password') ||
        key.includes('senha') ||
        key.includes('secret') ||
        key.includes('plain')
      ) {
        continue
      }
      safe[k] = v
    }
    if (Object.keys(safe).length > 0) payload.meta = safe
  }

  const ref = await db.collection(collection).add(payload)
  return ref.id
}
