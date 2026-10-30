import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth, db } from './firebase'
import { adminPhoneDocId, adminUserDocId, normalizeAdminEmail } from './adminPermissions'
import { navPermissionsFor, type ProfileId } from './adminProfiles'
import { ADMIN_USERS_COLLECTION } from './adminUserFirestore'

export type UserDraft = {
  email: string
  /** Nome e telefone (opcionais, 1.1.1.b). */
  name?: string
  phone?: string
  /** Só com telefone e e-mail: qual vale para a senha (lib/loginRule.ts). */
  loginIdentifier?: 'phone' | 'email'
  profile: ProfileId
  /** Instituições do usuário (aba Instituições). Vazio na aba Crias. */
  institutionIds: string[]
  active: boolean
  /** 1.3.8 e 1.3.16: só do Professor. Gestão e Super admin: todas (gravado vazio). */
  materias?: string[]
  turmas?: string[]
  /** Trilhas vinculadas ao Professor. */
  trailIds?: string[]
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function draftValid(d: UserDraft, needsInstitution: boolean): boolean {
  // Nome obrigatório e e-mail ou telefone (o acesso é por um dos dois).
  if (!(d.name ?? '').trim()) return false
  const email = d.email.trim()
  if (email ? !EMAIL_RE.test(email) : !(d.phone ?? '').replace(/\D/g, '')) return false
  if (needsInstitution && d.institutionIds.length === 0) return false
  return true
}

/** Grava o usuário em `admin_users` com os campos de sempre. Escola nunca tem Super admin. */
export async function saveAdminUser(
  d: UserDraft,
  scope: 'crias' | 'institution',
  isNew: boolean,
): Promise<string> {
  if (!db) throw new Error('Firebase não inicializado.')
  const email = d.email.trim() ? normalizeAdminEmail(d.email) : ''
  const id = email ? adminUserDocId(email) : adminPhoneDocId(d.phone ?? '')
  const isSuper = scope === 'crias' && d.profile === 'super'
  const profile = d.profile === 'basico' ? 'basico' : 'admin'
  await setDoc(
    doc(db, ADMIN_USERS_COLLECTION, id),
    {
      email,
      ...(d.name?.trim() ? { name: d.name.trim() } : {}),
      ...(d.phone?.trim() ? { phone_number: d.phone.trim() } : {}),
      login_identifier: d.email.trim() && (d.phone ?? '').replace(/\D/g, '') ? (d.loginIdentifier ?? 'phone') : null,
      active: d.active,
      is_super_admin: isSuper,
      is_master: isSuper || profile === 'admin',
      nav_permissions: isSuper ? [] : navPermissionsFor(profile),
      institution_ids: scope === 'institution' ? d.institutionIds : [],
      all_institutions: scope === 'crias',
      // CONFLITO 1.3.E.2: campos novos do usuário (vazio = todas, em Gestão e Super admin).
      materias: profile === 'basico' && !isSuper ? (d.materias ?? []) : [],
      turmas: profile === 'basico' && !isSuper ? (d.turmas ?? []) : [],
      trail_ids: profile === 'basico' && !isSuper ? (d.trailIds ?? []) : [],
      updated_at: serverTimestamp(),
      ...(isNew ? { created_at: serverTimestamp() } : {}),
    },
    { merge: true },
  )
  return id
}

export async function deleteAdminUser(id: string): Promise<void> {
  if (!db) throw new Error('Firebase não inicializado.')
  await deleteDoc(doc(db, ADMIN_USERS_COLLECTION, id))
}

/** A senha do login da Gestão é do Firebase Auth: aqui se envia o e-mail de redefinição. */
export async function sendPasswordReset(email: string): Promise<void> {
  if (!auth) throw new Error('Firebase Auth não inicializado.')
  await sendPasswordResetEmail(auth, email.trim())
}
