import type { Timestamp } from 'firebase/firestore'

/** Itens de navegação que podem ser liberados por login. */
export const NAV_PERMISSIONS = [
  'home',
  'institution_new',
  'student_new',
  'trail_new',
  'gerenciamento',
  'dashboard',
  'gabarito',
  'doc',
  'admin',
] as const

export type NavPermission = (typeof NAV_PERMISSIONS)[number]

export interface AdminUser {
  id: string
  email: string
  active: boolean
  is_super_admin: boolean
  /** Tópicos do menu que o login pode ver. Ignorado se `is_super_admin`. */
  nav_permissions: NavPermission[]
  /** Instituições permitidas. Ignorado se `is_super_admin` ou `all_institutions`. */
  institution_ids: string[]
  /** Acesso a todas as instituições (sem listar uma a uma). */
  all_institutions: boolean
  created_at: Timestamp | null
  updated_at: Timestamp | null
}
