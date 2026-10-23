import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  canAccessInstitution,
  canAccessNav,
  canAccessStudentPasswords,
  hasFullAccess,
  isMasterAccess,
} from './adminPermissions'
import type { AdminUser } from '../types/adminUser'

function profile(partial: Partial<AdminUser>): AdminUser {
  return {
    id: 'u1',
    email: 'user@exemplo.com',
    active: true,
    is_super_admin: false,
    is_master: false,
    nav_permissions: ['home'],
    institution_ids: [],
    all_institutions: true,
    created_at: null,
    updated_at: null,
    ...partial,
  }
}

describe('Master access', () => {
  const prev = import.meta.env.VITE_MASTER_ADMIN_EMAILS

  beforeEach(() => {
    vi.stubEnv('VITE_MASTER_ADMIN_EMAILS', 'derik@crias.ai')
  })

  afterEach(() => {
    if (prev === undefined) vi.unstubAllEnvs()
    else vi.stubEnv('VITE_MASTER_ADMIN_EMAILS', prev)
  })

  it('Master do env libera senhas, prompts e todas as instituições', () => {
    expect(isMasterAccess(null, 'derik@crias.ai')).toBe(true)
    expect(hasFullAccess(null, 'derik@crias.ai')).toBe(true)
    expect(
      canAccessNav(null, 'student_passwords', { userEmail: 'derik@crias.ai' }),
    ).toBe(true)
    expect(
      canAccessNav(null, 'ai_prompts', { userEmail: 'derik@crias.ai' }),
    ).toBe(true)
  })

  it('is_master + all_institutions no perfil é Master global', () => {
    const p = profile({
      is_master: true,
      all_institutions: true,
      email: 'master@exemplo.com',
    })
    expect(isMasterAccess(p, p.email)).toBe(true)
    expect(canAccessNav(p, 'ai_prompts', { userEmail: p.email })).toBe(true)
  })

  it('Admin escola (is_master sem all_institutions) NÃO é Master global', () => {
    const p = profile({
      is_master: true,
      all_institutions: false,
      is_super_admin: false,
      institution_ids: ['i2'],
      email: 'escola@exemplo.com',
    })
    expect(isMasterAccess(p, p.email)).toBe(false)
    expect(hasFullAccess(p, p.email)).toBe(false)
    expect(canAccessInstitution(p, 'i2', { userEmail: p.email })).toBe(true)
    expect(canAccessInstitution(p, 'i1', { userEmail: p.email })).toBe(false)
    expect(canAccessStudentPasswords(p, p.email)).toBe(true)
    expect(canAccessNav(p, 'student_passwords', { userEmail: p.email })).toBe(
      true,
    )
    expect(canAccessNav(p, 'ai_prompts', { userEmail: p.email })).toBe(false)
  })

  it('super admin sem is_master não vê senhas nem prompts', () => {
    const p = profile({ is_super_admin: true, is_master: false })
    expect(canAccessNav(p, 'student_passwords', { userEmail: p.email })).toBe(
      false,
    )
    expect(canAccessNav(p, 'ai_prompts', { userEmail: p.email })).toBe(false)
  })

  it('perfil inativo não é Master (só pelo doc)', () => {
    const p = profile({
      is_master: true,
      all_institutions: true,
      active: false,
    })
    expect(isMasterAccess(p, p.email)).toBe(false)
  })

  it('sem perfil e sem e-mail Master → sem nav', () => {
    expect(canAccessNav(null, 'home', { userEmail: 'outro@exemplo.com' })).toBe(
      false,
    )
  })
})
