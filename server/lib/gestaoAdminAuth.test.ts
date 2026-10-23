import { describe, expect, it, vi, beforeEach } from 'vitest'

const verifyIdToken = vi.fn()

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ verifyIdToken }),
}))

import {
  canAccessInstitution,
  filterInstitutionsByAccess,
  requireGestaoAdminFromRequest,
  type GestaoAdminPrincipal,
} from './gestaoAdminAuth'

function mockDb(adminDocs: Array<Record<string, unknown>>) {
  return {
    collection: () => ({
      where: () => ({
        limit: () => ({
          get: async () => ({
            empty: adminDocs.length === 0,
            docs: adminDocs.map((data) => ({ data: () => data })),
          }),
        }),
      }),
    }),
  } as unknown as import('firebase-admin/firestore').Firestore
}

describe('gestaoAdminAuth', () => {
  beforeEach(() => {
    verifyIdToken.mockReset()
  })

  it('sem Authorization → 401', async () => {
    const r = await requireGestaoAdminFromRequest(mockDb([]), null, {
      MASTER_ADMIN_EMAILS: '',
    } as NodeJS.ProcessEnv)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.status).toBe(401)
  })

  it('token inválido → 401', async () => {
    verifyIdToken.mockRejectedValue(new Error('bad'))
    const r = await requireGestaoAdminFromRequest(
      mockDb([]),
      'Bearer x.y.z',
      { MASTER_ADMIN_EMAILS: '' } as NodeJS.ProcessEnv,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.status).toBe(401)
  })

  it('Master (env) vê todas as instituições', async () => {
    verifyIdToken.mockResolvedValue({
      email: 'master@exemplo.com',
      uid: 'u1',
    })
    const r = await requireGestaoAdminFromRequest(
      mockDb([]),
      'Bearer good',
      { MASTER_ADMIN_EMAILS: 'master@exemplo.com' } as NodeJS.ProcessEnv,
    )
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.principal.allowedInstitutionIds).toBeNull()
      expect(r.principal.isMaster).toBe(true)
      expect(canAccessInstitution(r.principal, 'i2')).toBe(true)
    }
  })

  it('escola só acessa institution_ids', async () => {
    verifyIdToken.mockResolvedValue({
      email: 'escola@exemplo.com',
      uid: 'u2',
    })
    const r = await requireGestaoAdminFromRequest(
      mockDb([
        {
          email: 'escola@exemplo.com',
          active: true,
          is_master: false,
          is_super_admin: false,
          all_institutions: false,
          institution_ids: ['i2'],
        },
      ]),
      'Bearer good',
      { MASTER_ADMIN_EMAILS: '' } as NodeJS.ProcessEnv,
    )
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.principal.allowedInstitutionIds).toEqual(['i2'])
      expect(canAccessInstitution(r.principal, 'i2')).toBe(true)
      expect(canAccessInstitution(r.principal, 'i1')).toBe(false)
      expect(
        filterInstitutionsByAccess(r.principal, [
          { id: 'i1' },
          { id: 'i2' },
          { id: 'i4' },
        ]),
      ).toEqual([{ id: 'i2' }])
    }
  })

  it('usuário sem admin_users (legado) vê todas as instituições', async () => {
    verifyIdToken.mockResolvedValue({
      email: 'random@exemplo.com',
      uid: 'u3',
    })
    const r = await requireGestaoAdminFromRequest(
      mockDb([]),
      'Bearer good',
      { MASTER_ADMIN_EMAILS: '' } as NodeJS.ProcessEnv,
    )
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.principal.allowedInstitutionIds).toBeNull()
      expect(canAccessInstitution(r.principal, 'i2')).toBe(true)
    }
  })

  it('admin_users inativo → 403', async () => {
    verifyIdToken.mockResolvedValue({
      email: 'off@exemplo.com',
      uid: 'u3b',
    })
    const r = await requireGestaoAdminFromRequest(
      mockDb([
        {
          email: 'off@exemplo.com',
          active: false,
          is_super_admin: true,
          all_institutions: true,
          is_master: false,
          institution_ids: [],
        },
      ]),
      'Bearer good',
      { MASTER_ADMIN_EMAILS: '' } as NodeJS.ProcessEnv,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.status).toBe(403)
  })

  it('super admin vê todas', async () => {
    verifyIdToken.mockResolvedValue({
      email: 'super@exemplo.com',
      uid: 'u4',
    })
    const r = await requireGestaoAdminFromRequest(
      mockDb([
        {
          email: 'super@exemplo.com',
          active: true,
          is_super_admin: true,
          all_institutions: false,
          is_master: false,
          institution_ids: [],
        },
      ]),
      'Bearer good',
      { MASTER_ADMIN_EMAILS: '' } as NodeJS.ProcessEnv,
    )
    expect(r.ok).toBe(true)
    if (r.ok) {
      const p: GestaoAdminPrincipal = r.principal
      expect(p.allowedInstitutionIds).toBeNull()
    }
  })
})
