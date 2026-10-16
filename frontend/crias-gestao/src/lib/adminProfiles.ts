import type { AdminUser, NavPermission } from '../types/adminUser'

/**
 * Perfis da Gestão (INTERFACE.md 1.1.12): nomes para combinações prontas dos campos que
 * `admin_users` já tem (`is_super_admin`, `is_master`, `nav_permissions`). Nada novo no banco.
 * - Super admin: `is_super_admin`.
 * - Admin: `is_master` e menu completo da escola (inclui Senhas e Permissões).
 * - Básico: só Início, Dados e Trilhas.
 */

export type ProfileId = 'super' | 'admin' | 'basico'

export const PROFILE_LABEL: Record<ProfileId, string> = {
  super: 'Super admin',
  admin: 'Admin',
  basico: 'Básico',
}

export type MenuKey = 'home' | 'dash' | 'trilhas' | 'alunos' | 'senhas' | 'admin'

export const MENU_ITEMS: Array<{ key: MenuKey; label: string; permission: NavPermission }> = [
  { key: 'home', label: 'Início', permission: 'home' },
  { key: 'dash', label: 'Dados', permission: 'dashboard' },
  { key: 'trilhas', label: 'Trilhas', permission: 'trail_new' },
  { key: 'alunos', label: 'Alunos', permission: 'student_new' },
  { key: 'senhas', label: 'Senhas', permission: 'student_passwords' },
  { key: 'admin', label: 'Permissões', permission: 'admin' },
]

/** Menu de cada perfil pronto. Fixo no código. */
export const PROFILE_MENU: Record<Exclude<ProfileId, 'super'>, MenuKey[]> = {
  admin: ['home', 'dash', 'trilhas', 'alunos', 'senhas', 'admin'],
  basico: ['home', 'dash', 'trilhas'],
}

/** Itens de menu de um perfil no formato das permissões do banco. */
export function navPermissionsFor(profile: Exclude<ProfileId, 'super'>): NavPermission[] {
  return MENU_ITEMS.filter(
    (m) => PROFILE_MENU[profile].includes(m.key) && m.permission !== 'student_passwords',
  ).map((m) => m.permission)
}

/** Perfil de um usuário, lido dos campos que já existem. */
export function profileOf(user: Pick<AdminUser, 'is_super_admin' | 'is_master'>): ProfileId {
  if (user.is_super_admin) return 'super'
  return user.is_master ? 'admin' : 'basico'
}
