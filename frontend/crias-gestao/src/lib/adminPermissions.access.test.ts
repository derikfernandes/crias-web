import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  canAccessInstitution,
  canAccessNav,
  filterInstitutionsByAccess,
  hasFullAccess,
  hasGestaoAccess,
  isMasterAccess,
  isUnrestrictedAccess,
} from './adminPermissions'
import type { AdminUser } from '../types/adminUser'

function profile(partial: Partial<AdminUser>): AdminUser {
  return {
    id: 'u1',
    email: 'user@exemplo.com',
    active: true,
    is_super_admin: false,
    is_master: false,
    nav_permissions: ['home', 'dashboard'],
    institution_ids: ['i2'],
    all_institutions: false,
    created_at: null,
    updated_at: null,
    ...partial,
  }
}

describe('adminPermissions — 3 casos PR #32', () => {
  const prev = import.meta.env.VITE_MASTER_ADMIN_EMAILS

  beforeEach(() => {
    vi.stubEnv('VITE_MASTER_ADMIN_EMAILS', ' derik@crias.ai , thiago@crias.ai ')
  })

  afterEach(() => {
    if (prev === undefined) vi.unstubAllEnvs()
    else vi.stubEnv('VITE_MASTER_ADMIN_EMAILS', prev)
  })

  it('1) Master (env, trim+case) → acesso total', () => {
    expect(isMasterAccess(null, ' Derik@Crias.ai ')).toBe(true)
    expect(hasGestaoAccess(null, 'derik@crias.ai')).toBe(true)
    expect(hasFullAccess(null, 'derik@crias.ai')).toBe(true)
    expect(canAccessNav(null, 'home', { userEmail: 'derik@crias.ai' })).toBe(
      true,
    )
    expect(
      canAccessInstitution(null, 'i2', { userEmail: 'derik@crias.ai' }),
    ).toBe(true)
    expect(
      filterInstitutionsByAccess(
        null,
        [{ id: 'i1' }, { id: 'i2' }],
        { userEmail: 'derik@crias.ai' },
      ),
    ).toEqual([{ id: 'i1' }, { id: 'i2' }])
  })

  it('2) admin_users escola → só as instituições do perfil', () => {
    const p = profile({ institution_ids: ['i2'] })
    expect(hasGestaoAccess(p, p.email)).toBe(true)
    expect(hasFullAccess(p, p.email)).toBe(false)
    expect(canAccessInstitution(p, 'i2', { userEmail: p.email })).toBe(true)
    expect(canAccessInstitution(p, 'i1', { userEmail: p.email })).toBe(false)
    expect(
      filterInstitutionsByAccess(p, [{ id: 'i1' }, { id: 'i2' }], {
        userEmail: p.email,
      }),
    ).toEqual([{ id: 'i2' }])
    expect(canAccessNav(p, 'dashboard', { userEmail: p.email })).toBe(true)
    expect(
      canAccessNav(p, 'student_passwords', { userEmail: p.email }),
    ).toBe(false)
  })

  it('3) sem perfil e não Master → sem acesso', () => {
    expect(isUnrestrictedAccess(null)).toBe(false)
    expect(hasGestaoAccess(null, 'terceiro@gmail.com')).toBe(false)
    expect(hasFullAccess(null, 'terceiro@gmail.com')).toBe(false)
    expect(
      canAccessNav(null, 'home', { userEmail: 'terceiro@gmail.com' }),
    ).toBe(false)
    expect(
      canAccessInstitution(null, 'i2', { userEmail: 'terceiro@gmail.com' }),
    ).toBe(false)
    expect(
      filterInstitutionsByAccess(null, [{ id: 'i2' }], {
        userEmail: 'terceiro@gmail.com',
      }),
    ).toEqual([])
  })
})
