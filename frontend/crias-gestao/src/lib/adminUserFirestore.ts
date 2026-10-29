import type {
  DocumentSnapshot,
  QueryDocumentSnapshot,
} from 'firebase/firestore'
import { NAV_PERMISSIONS, type AdminUser, type NavPermission } from '../types/adminUser'
import { normalizeAdminEmail } from './adminPermissions'

export const ADMIN_USERS_COLLECTION = 'admin_users'

function parseNavPermissions(value: unknown): NavPermission[] {
  if (!Array.isArray(value)) return []
  const allowed = new Set<string>(NAV_PERMISSIONS)
  return value.filter((item): item is NavPermission => {
    return typeof item === 'string' && allowed.has(item)
  })
}

function parseInstitutionIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
}

export function snapshotToAdminUser(
  d: DocumentSnapshot | QueryDocumentSnapshot,
): AdminUser {
  const data = d.data()
  if (!data) {
    return {
      id: d.id,
      email: '',
      active: false,
      is_super_admin: false,
      is_master: false,
      nav_permissions: [],
      institution_ids: [],
      all_institutions: false,
      created_at: null,
      updated_at: null,
    }
  }

  return {
    id: d.id,
    email:
      typeof data.email === 'string'
        ? normalizeAdminEmail(data.email)
        : d.id.startsWith('tel_')
          ? ''
          : normalizeAdminEmail(d.id.replace(/_/g, '.')),
    ...(typeof data.name === 'string' && data.name ? { name: data.name } : {}),
    ...(typeof data.phone_number === 'string' && data.phone_number ? { phone_number: data.phone_number } : {}),
    ...(data.login_identifier === 'phone' || data.login_identifier === 'email' ? { login_identifier: data.login_identifier } : {}),
    active: data.active !== false,
    is_super_admin: Boolean(data.is_super_admin),
    is_master: Boolean(data.is_master),
    nav_permissions: parseNavPermissions(data.nav_permissions),
    institution_ids: parseInstitutionIds(data.institution_ids),
    all_institutions: Boolean(data.all_institutions),
    created_at: data.created_at ?? null,
    updated_at: data.updated_at ?? null,
  }
}
