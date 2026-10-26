import type { AdminUser, NavPermission } from '../types/adminUser'

/**
 * Perfis da Gestão (INTERFACE.md 1.1.12): nomes para combinações prontas dos campos que
 * `admin_users` já tem (`is_super_admin`, `is_master`, `nav_permissions`). Nada novo no banco.
 * - Super admin: `is_super_admin`.
 * - Admin: `is_master` e menu completo da escola (inclui Senhas e Permissões).
 * - Básico: só Início, Dados e Trilhas.
 */

export type ProfileId = 'super' | 'admin' | 'basico'
/** Perfis que o Super admin pode editar (o Super admin sempre acessa tudo). */
export type EditableProfileId = Exclude<ProfileId, 'super'>

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

/** Menu padrão de cada perfil. O Super admin pode mudar (coleção `admin_profiles`, ver adminProfileOps.ts). */
export const PROFILE_MENU: Record<EditableProfileId, MenuKey[]> = {
  admin: ['home', 'dash', 'trilhas', 'alunos', 'senhas', 'admin'],
  basico: ['home', 'dash', 'trilhas'],
}

/** Chaves de menu no formato das permissões do banco. Senhas fica de fora: vem do Master. */
export function navPermissionsForMenu(menu: MenuKey[]): NavPermission[] {
  return MENU_ITEMS.filter((m) => menu.includes(m.key) && m.permission !== 'student_passwords').map((m) => m.permission)
}

let activeMenus: Record<EditableProfileId, MenuKey[]> = PROFILE_MENU

/** Menus salvos em `admin_profiles`, mantidos aqui para quem grava usuário (saveAdminUser) usar o menu certo. */
export function setActiveProfileMenus(menus: Record<EditableProfileId, MenuKey[]>): void {
  activeMenus = menus
}

/** Itens de menu de um perfil no formato das permissões do banco (menu salvo, senão o padrão). */
export function navPermissionsFor(profile: EditableProfileId): NavPermission[] {
  return navPermissionsForMenu(activeMenus[profile])
}

/** Perfil de um usuário, lido dos campos que já existem. */
export function profileOf(user: Pick<AdminUser, 'is_super_admin' | 'is_master'>): ProfileId {
  if (user.is_super_admin) return 'super'
  return user.is_master ? 'admin' : 'basico'
}
