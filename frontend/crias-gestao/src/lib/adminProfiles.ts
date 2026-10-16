import { doc, getDoc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore'
import { db } from './firebase'
import type { AdminUser, NavPermission } from '../types/adminUser'

/**
 * Perfis de menu da Gestão (INTERFACE.md 1.1.12 e orientações 12, 15, 16).
 * Super admin acessa tudo. Admin e Básico têm itens de menu editáveis pelo Super admin;
 * o que fica guardado em `admin_settings/profiles`. Ao salvar, os itens são copiados para
 * `nav_permissions` dos usuários do perfil, então o resto do app segue lendo o mesmo campo.
 */

export type ProfileId = 'admin' | 'basico'
export type MenuKey = 'home' | 'dash' | 'trilhas' | 'alunos' | 'senhas' | 'admin'

export const MENU_ITEMS: Array<{ key: MenuKey; label: string; permission: NavPermission }> = [
  { key: 'home', label: 'Início', permission: 'home' },
  { key: 'dash', label: 'Dados', permission: 'dashboard' },
  { key: 'trilhas', label: 'Trilhas', permission: 'trail_new' },
  { key: 'alunos', label: 'Alunos', permission: 'student_new' },
  { key: 'senhas', label: 'Senhas', permission: 'student_passwords' },
  { key: 'admin', label: 'Permissões', permission: 'admin' },
]

export const PROFILE_LABEL: Record<ProfileId, string> = { admin: 'Admin', basico: 'Básico' }

export const DEFAULT_PROFILES: Record<ProfileId, MenuKey[]> = {
  admin: ['home', 'dash', 'trilhas', 'alunos', 'senhas', 'admin'],
  basico: ['home', 'dash', 'trilhas'],
}

export const SETTINGS_COLLECTION = 'admin_settings'
export const PROFILES_DOC = 'profiles'

function isMenuKey(v: unknown): v is MenuKey {
  return typeof v === 'string' && MENU_ITEMS.some((m) => m.key === v)
}

export function parseProfiles(raw: unknown): Record<ProfileId, MenuKey[]> {
  const data = (raw ?? {}) as Record<string, unknown>
  const pick = (id: ProfileId): MenuKey[] => {
    const list = data[id]
    return Array.isArray(list) ? list.filter(isMenuKey) : DEFAULT_PROFILES[id]
  }
  const out = { admin: pick('admin'), basico: pick('basico') }
  // Senha dos alunos só existe para o perfil Admin (Master).
  out.basico = out.basico.filter((k) => k !== 'senhas')
  return out
}

export async function loadProfiles(): Promise<Record<ProfileId, MenuKey[]>> {
  if (!db) return DEFAULT_PROFILES
  const snap = await getDoc(doc(db, SETTINGS_COLLECTION, PROFILES_DOC))
  return parseProfiles(snap.exists() ? snap.data() : null)
}

/** Itens de menu de um perfil no formato das permissões do banco. */
export function navPermissionsFor(menu: MenuKey[]): NavPermission[] {
  const out: NavPermission[] = []
  for (const m of MENU_ITEMS) {
    if (menu.includes(m.key) && m.permission !== 'student_passwords') out.push(m.permission)
  }
  return out
}

export function profileOf(user: Pick<AdminUser, 'is_super_admin' | 'profile' | 'is_master'>): 'super' | ProfileId {
  if (user.is_super_admin) return 'super'
  if (user.profile) return user.profile
  return user.is_master ? 'admin' : 'basico'
}

/** Salva o menu de um perfil e aplica aos usuários desse perfil. */
export async function saveProfileMenu(
  profile: ProfileId,
  menu: MenuKey[],
  all: Record<ProfileId, MenuKey[]>,
  users: AdminUser[],
): Promise<void> {
  if (!db) throw new Error('Firebase não inicializado.')
  const next = { ...all, [profile]: menu }
  await setDoc(
    doc(db, SETTINGS_COLLECTION, PROFILES_DOC),
    { admin: next.admin, basico: next.basico, updated_at: serverTimestamp() },
    { merge: true },
  )
  const mine = users.filter((u) => profileOf(u) === profile)
  const dbOk = db
  for (let i = 0; i < mine.length; i += 400) {
    const batch = writeBatch(dbOk)
    for (const u of mine.slice(i, i + 400)) {
      batch.update(doc(dbOk, 'admin_users', u.id), {
        nav_permissions: navPermissionsFor(menu),
        updated_at: serverTimestamp(),
      })
    }
    await batch.commit()
  }
}
