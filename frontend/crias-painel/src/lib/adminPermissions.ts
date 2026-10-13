import type { AdminUser, NavPermission } from '../types/adminUser'

export const NAV_ITEMS: {
  key: NavPermission
  label: string
  path: string
}[] = [
  { key: 'home', label: 'Início', path: '/' },
  { key: 'institution_new', label: 'Criar instituição', path: '/instituicoes/novo' },
  { key: 'student_new', label: 'Alunos', path: '/alunos' },
  { key: 'trail_new', label: 'Trilhas', path: '/trilhas' },
  { key: 'gerenciamento', label: 'Visão por instituição', path: '/gerenciamento' },
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard' },
  { key: 'gabarito', label: 'Gabaritos', path: '/gabarito' },
  { key: 'doc', label: 'API e documentação', path: '/doc' },
  { key: 'admin', label: 'Usuários e permissões', path: '/admin' },
]

export type SidebarNavChild = {
  key: NavPermission
  label: string
  path: string
}

export type SidebarNavLink = {
  type: 'link'
  key: NavPermission
  label: string
  path: string
}

export type SidebarNavGroup = {
  type: 'group'
  id: string
  label: string
  children: SidebarNavChild[]
}

export type SidebarNavEntry = SidebarNavLink | SidebarNavGroup

/** Árvore do menu lateral (ações “Novo *” ficam só como botões nas páginas). */
export const SIDEBAR_NAV: SidebarNavEntry[] = [
  { type: 'link', key: 'home', label: 'Início', path: '/' },
  { type: 'link', key: 'dashboard', label: 'Dashboard', path: '/dashboard' },
  {
    type: 'group',
    id: 'gestao-academica',
    label: 'Gestão acadêmica',
    children: [
      { key: 'student_new', label: 'Alunos', path: '/alunos' },
      {
        key: 'gerenciamento',
        label: 'Visão por instituição',
        path: '/gerenciamento',
      },
    ],
  },
  {
    type: 'group',
    id: 'conteudo-avaliacoes',
    label: 'Conteúdo e avaliações',
    children: [
      { key: 'trail_new', label: 'Trilhas', path: '/trilhas' },
      { key: 'gabarito', label: 'Gabaritos', path: '/gabarito' },
    ],
  },
  {
    type: 'group',
    id: 'administracao',
    label: 'Administração',
    children: [
      { key: 'admin', label: 'Usuários e permissões', path: '/admin' },
      { key: 'doc', label: 'API e documentação', path: '/doc' },
    ],
  },
]

const ROUTE_NAV_MAP: { prefix: string; permission: NavPermission }[] = [
  { prefix: '/admin', permission: 'admin' },
  { prefix: '/instituicoes/novo', permission: 'institution_new' },
  { prefix: '/instituicoes/', permission: 'home' },
  { prefix: '/alunos/novo', permission: 'student_new' },
  { prefix: '/alunos', permission: 'student_new' },
  { prefix: '/trilhas/novo', permission: 'trail_new' },
  { prefix: '/trilhas', permission: 'trail_new' },
  { prefix: '/gerenciamento', permission: 'gerenciamento' },
  { prefix: '/dashboard', permission: 'dashboard' },
  { prefix: '/gabarito', permission: 'gabarito' },
  { prefix: '/doc', permission: 'doc' },
  { prefix: '/', permission: 'home' },
]

export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function adminUserDocId(email: string): string {
  return normalizeAdminEmail(email).replace(/\./g, '_')
}

/** Sem registro em `admin_users`: mantém acesso total (compatibilidade). */
export function isUnrestrictedAccess(profile: AdminUser | null): boolean {
  return profile === null
}

export function hasFullAccess(profile: AdminUser | null): boolean {
  if (isUnrestrictedAccess(profile)) return true
  return Boolean(profile?.active && profile.is_super_admin)
}

export function canAccessNav(
  profile: AdminUser | null,
  permission: NavPermission,
): boolean {
  if (profile === null) return true
  if (!profile.active) return false
  if (profile.is_super_admin) return true
  return profile.nav_permissions.includes(permission)
}

export function canAccessInstitution(
  profile: AdminUser | null,
  institutionId: string,
): boolean {
  if (profile === null) return true
  if (!profile.active) return false
  if (profile.is_super_admin || profile.all_institutions) return true
  return profile.institution_ids.includes(institutionId)
}

export function filterInstitutionsByAccess<T extends { id: string }>(
  profile: AdminUser | null,
  items: T[],
): T[] {
  if (profile === null) return items
  if (!profile.active) return []
  if (profile.is_super_admin || profile.all_institutions) return items
  const allowed = new Set(profile.institution_ids)
  return items.filter((item) => allowed.has(item.id))
}

export function navPermissionForPath(pathname: string): NavPermission {
  const path = pathname.replace(/\/$/, '') || '/'
  for (const entry of ROUTE_NAV_MAP) {
    if (entry.prefix === '/') {
      if (path === '/') return entry.permission
      continue
    }
    if (path === entry.prefix || path.startsWith(`${entry.prefix}`)) {
      return entry.permission
    }
  }
  return 'home'
}

export function defaultNavPermissions(): NavPermission[] {
  return NAV_ITEMS.map((item) => item.key).filter((key) => key !== 'admin')
}
