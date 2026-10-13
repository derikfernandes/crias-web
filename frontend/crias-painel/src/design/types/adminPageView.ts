import type { FormEvent } from 'react'

export type AdminNavItemOption = {
  key: string
  label: string
}

export type AdminInstitutionOption = {
  id: string
  label: string
}

export type AdminUserRow = {
  id: string
  email: string
  activeLabel: string
  scopeLabel: string
  menuLabel: string
  deleting: boolean
}

export type AdminFormViewModel = {
  email: string
  active: boolean
  is_super_admin: boolean
  all_institutions: boolean
  nav_permissions: string[]
  institution_ids: string[]
}

type AdminPageViewBase = {
  status: 'loading' | 'forbidden' | 'ok'
}

export type AdminPageViewOkProps = AdminPageViewBase & {
  status: 'ok'
  listError: string | null
  editingId: string | null
  form: AdminFormViewModel
  formError: string | null
  saving: boolean
  loadingUsers: boolean
  navItems: AdminNavItemOption[]
  institutions: AdminInstitutionOption[]
  users: AdminUserRow[]
  onStartCreate: () => void
  onEmailChange: (value: string) => void
  onActiveChange: (checked: boolean) => void
  onSuperAdminChange: (checked: boolean) => void
  onAllInstitutionsChange: (checked: boolean) => void
  onToggleNav: (key: string) => void
  onToggleInstitution: (id: string) => void
  onSubmit: (e: FormEvent) => void
  onEditUser: (userId: string) => void
  onDeleteUser: (userId: string) => void
}

export type AdminPageViewProps =
  | { status: 'loading' }
  | { status: 'forbidden' }
  | AdminPageViewOkProps
