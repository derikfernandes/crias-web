import { doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import type { DocumentSnapshot, QueryDocumentSnapshot } from 'firebase/firestore'
import { db } from './firebase'
import { ADMIN_USERS_COLLECTION } from './adminUserFirestore'
import {
  MENU_ITEMS,
  PROFILE_MENU,
  navPermissionsForMenu,
  profileOf,
  type EditableProfileId,
  type MenuKey,
} from './adminProfiles'
import type { AdminUser } from '../types/adminUser'

/**
 * Perfis editáveis (1.1.1.b, aprovado pelo Thiago). Coleção nova `admin_profiles/{admin|basico}` com
 * `nav_permissions: MenuKey[]` (as chaves de menu de adminProfiles.ts). Sem o documento, valem os padrões
 * de `PROFILE_MENU`. Quem edita é só o Super admin; a escola vê sem editar.
 * CURSOR 1.2: publicar as regras do Firestore (coleção `admin_profiles` em firestore.rules).
 */
export const ADMIN_PROFILES_COLLECTION = 'admin_profiles'

export type ProfileMenus = Record<EditableProfileId, MenuKey[]>

const VALID = new Set<string>(MENU_ITEMS.map((m) => m.key))

export function snapshotToProfileMenu(d: DocumentSnapshot | QueryDocumentSnapshot): { id: string; menu: MenuKey[] } {
  const raw = d.data()?.nav_permissions
  const menu = Array.isArray(raw) ? raw.filter((k): k is MenuKey => typeof k === 'string' && VALID.has(k)) : []
  return { id: d.id, menu }
}

/** Menus efetivos: o que está salvo, senão o padrão. */
export function resolveProfileMenus(stored: Array<{ id: string; menu: MenuKey[] }>): ProfileMenus {
  const out: ProfileMenus = { admin: [...PROFILE_MENU.admin], basico: [...PROFILE_MENU.basico] }
  for (const s of stored) {
    if (s.id === 'admin' || s.id === 'basico') out[s.id] = s.menu
  }
  // Início é sempre liberado: sem ele a pessoa não abre o painel.
  for (const p of ['admin', 'basico'] as const) if (!out[p].includes('home')) out[p] = ['home', ...out[p]]
  return out
}

/**
 * Grava o menu dos perfis alterados e reescreve `nav_permissions` dos usuários de cada perfil
 * (o acesso do usuário continua sendo lido do próprio documento, como antes).
 */
export async function saveProfileMenus(changed: Partial<ProfileMenus>, users: AdminUser[]): Promise<void> {
  if (!db) throw new Error('Firebase não inicializado.')
  const dbOk = db
  const batch = writeBatch(dbOk)
  for (const [profile, menu] of Object.entries(changed) as Array<[EditableProfileId, MenuKey[]]>) {
    batch.set(
      doc(dbOk, ADMIN_PROFILES_COLLECTION, profile),
      { nav_permissions: menu, updated_at: serverTimestamp() },
      { merge: true },
    )
    for (const u of users) {
      if (u.is_super_admin || profileOf(u) !== profile) continue
      batch.update(doc(dbOk, ADMIN_USERS_COLLECTION, u.id), {
        nav_permissions: navPermissionsForMenu(menu),
        updated_at: serverTimestamp(),
      })
    }
  }
  await batch.commit()
}
