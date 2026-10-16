import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth, db } from './firebase'
import { adminUserDocId, normalizeAdminEmail } from './adminPermissions'
import { navPermissionsFor, type MenuKey, type ProfileId } from './adminProfiles'
import { ADMIN_USERS_COLLECTION } from './adminUserFirestore'

export type UserDraft = {
  email: string
  name: string
  phone: string
  /** "super" só na aba Crias. */
  profile: 'super' | ProfileId
  /** Instituições do usuário (aba Instituições). Vazio na aba Crias. */
  institutionIds: string[]
  active: boolean
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function draftValid(d: UserDraft, needsInstitution: boolean): boolean {
  if (!d.name.trim() || !EMAIL_RE.test(d.email.trim())) return false
  if (needsInstitution && d.institutionIds.length === 0) return false
  return true
}

/** Grava o usuário em `admin_users`. Escola nunca tem Super admin. */
export async function saveAdminUser(
  d: UserDraft,
  menus: Record<ProfileId, MenuKey[]>,
  scope: 'crias' | 'institution',
  isNew: boolean,
): Promise<string> {
  if (!db) throw new Error('Firebase não inicializado.')
  const email = normalizeAdminEmail(d.email)
  const id = adminUserDocId(email)
  const isSuper = scope === 'crias' && d.profile === 'super'
  const profile: ProfileId = d.profile === 'basico' ? 'basico' : 'admin'
  await setDoc(
    doc(db, ADMIN_USERS_COLLECTION, id),
    {
      email,
      name: d.name.trim(),
      phone: d.phone.trim(),
      active: d.active,
      is_super_admin: isSuper,
      is_master: isSuper || profile === 'admin',
      profile: isSuper ? 'admin' : profile,
      nav_permissions: isSuper ? [] : navPermissionsFor(menus[profile]),
      institution_ids: scope === 'institution' ? d.institutionIds : [],
      all_institutions: scope === 'crias',
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
