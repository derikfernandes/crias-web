import { describe, expect, it } from 'vitest'
import { canAccessNav, isMasterAccess } from './adminPermissions'
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
  it('is_master no perfil libera senhas e prompts IA', () => {
    const p = profile({ is_master: true, email: 'master@exemplo.com' })
    expect(isMasterAccess(p, 'master@exemplo.com')).toBe(true)
    expect(canAccessNav(p, 'student_passwords', { userEmail: p.email })).toBe(
      true,
    )
    expect(canAccessNav(p, 'ai_prompts', { userEmail: p.email })).toBe(true)
  })

  it('super admin sem is_master não vê senhas nem prompts IA', () => {
    const p = profile({ is_super_admin: true, is_master: false })
    expect(canAccessNav(p, 'student_passwords', { userEmail: p.email })).toBe(
      false,
    )
    expect(canAccessNav(p, 'ai_prompts', { userEmail: p.email })).toBe(false)
  })

  it('perfil inativo não é Master (só pelo doc)', () => {
    const p = profile({ is_master: true, active: false })
    expect(isMasterAccess(p, p.email)).toBe(false)
  })

  it('sem perfil e sem e-mail Master → sem nav', () => {
    expect(canAccessNav(null, 'home', { userEmail: 'outro@exemplo.com' })).toBe(
      false,
    )
  })
})
