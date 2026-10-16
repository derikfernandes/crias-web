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
  'student_passwords',
  'ai_prompts',
] as const

export type NavPermission = (typeof NAV_PERMISSIONS)[number]

export interface AdminUser {
  id: string
  email: string
  /** Nome e telefone do usuário (campos opcionais da v1.1). */
  name?: string
  phone?: string
  /** Perfil de menu: Admin ou Básico (Super admin vem de `is_super_admin`). */
  profile?: 'admin' | 'basico'
  active: boolean
  is_super_admin: boolean
  /**
   * Master: revelar/exportar/gerar senhas de alunos.
   * Também concedido via env `VITE_MASTER_ADMIN_EMAILS` (espelho do servidor).
   * Nunca hardcode e-mails de pessoas no código.
   */
  is_master: boolean
  /** Tópicos do menu que o login pode ver. Ignorado se `is_super_admin`. */
  nav_permissions: NavPermission[]
  /** Instituições permitidas. Ignorado se `is_super_admin` ou `all_institutions`. */
  institution_ids: string[]
  /** Acesso a todas as instituições (sem listar uma a uma). */
  all_institutions: boolean
  created_at: Timestamp | null
  updated_at: Timestamp | null
}
