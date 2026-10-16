import type { NavPermission } from '../types/adminUser'

/** Seções do menu da Gestão v1.1 (INTERFACE.md 1.1.12 e 1.1.15). */
export type GxSection =
  | 'home'
  | 'dash'
  | 'trilhas'
  | 'alunos'
  | 'senhas'
  | 'admin'
  | 'prompts'
  | 'doc'

export type GxNavLink = {
  type: 'link'
  section: GxSection
  label: string
  path: string
  permission: NavPermission
}

export type GxNavHead = { type: 'head'; label: string }

export type GxNavItem = GxNavLink & {
  /** Só aparece para Master. */
  master?: boolean
  /** Só aparece para o Super admin (grupo Sistema). */
  superOnly?: boolean
}

export type GxNavGroup = {
  type: 'group'
  id: string
  label: string
  children: Array<GxNavItem | (GxNavHead & { superOnly?: boolean })>
}

export const GX_NAV: Array<GxNavLink | GxNavGroup> = [
  { type: 'link', section: 'home', label: 'Início', path: '/', permission: 'home' },
  { type: 'link', section: 'dash', label: 'Dados', path: '/dashboard', permission: 'dashboard' },
  { type: 'link', section: 'trilhas', label: 'Trilhas', path: '/trilhas', permission: 'trail_new' },
  { type: 'link', section: 'alunos', label: 'Alunos', path: '/alunos', permission: 'student_new' },
  {
    type: 'group',
    id: 'configuracoes',
    label: 'Configurações',
    children: [
      { type: 'head', label: 'Usuários' },
      { type: 'link', section: 'senhas', label: 'Senhas', path: '/alunos/senhas', permission: 'student_passwords', master: true },
      { type: 'link', section: 'admin', label: 'Permissões', path: '/admin', permission: 'admin' },
      { type: 'head', label: 'Sistema', superOnly: true },
      { type: 'link', section: 'prompts', label: 'Prompts', path: '/prompts', permission: 'ai_prompts', master: true, superOnly: true },
      { type: 'link', section: 'doc', label: 'API e documentação', path: '/doc', permission: 'doc', superOnly: true },
    ],
  },
]

/** Seção do menu destacada para o caminho atual. */
export function gxSectionForPath(pathname: string): GxSection {
  const path = pathname.replace(/\/$/, '') || '/'
  if (path === '/alunos/senhas') return 'senhas'
  if (path.startsWith('/alunos')) return 'alunos'
  if (path.startsWith('/trilhas')) return 'trilhas'
  if (path.startsWith('/dashboard')) return 'dash'
  if (path.startsWith('/admin')) return 'admin'
  if (path.startsWith('/prompts')) return 'prompts'
  if (path.startsWith('/doc')) return 'doc'
  return 'home'
}

/** Páginas em que o filtro de instituições do topo se aplica. */
export function gxHasScopeFilter(pathname: string): boolean {
  const path = pathname.replace(/\/$/, '') || '/'
  if (path.startsWith('/usuarios') || path.startsWith('/instituicoes')) return false
  const s = gxSectionForPath(pathname)
  return s === 'home' || s === 'dash' || s === 'trilhas' || s === 'alunos' || s === 'senhas'
}
