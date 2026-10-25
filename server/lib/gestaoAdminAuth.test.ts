import { describe, expect, it, vi, beforeEach } from 'vitest'

const verifyIdToken = vi.fn()

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ verifyIdToken }),
}))

import {
  canAccessInstitution,
  filterInstitutionsByAccess,
  requireGestaoAdminFromRequest,
} from './gestaoAdminAuth'

function mockDb(adminDocs: Array<Record<string, unknown> & { _id?: string }>) {
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
      doc: (id: string) => ({
        get: async () => {
          const found = adminDocs.find(
            (d) => d._id === id || String(d.email ?? '').replace(/\./g, '_') === id,
          )
          return {
            exists: Boolean(found),
            data: () => found ?? {},
          }
        },
      }),
    }),
  } as unknown as import('firebase-admin/firestore').Firestore
}

describe('gestaoAdminAuth — 3 casos PR #32', () => {
  beforeEach(() => {
    verifyIdToken.mockReset()
  })

  it('sem Authorization → 401', async () => {
    const r = await requireGestaoAdminFromRequest(mockDb([]), null, {
      MASTER_ADMIN_EMAILS: 'derik@crias.ai,thiago@crias.ai',
    } as NodeJS.ProcessEnv)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.status).toBe(401)
  })

  it('token inválido → 401', async () => {
    verifyIdToken.mockRejectedValue(new Error('bad'))
    const r = await requireGestaoAdminFromRequest(
      mockDb([]),
      'Bearer x.y.z',
      { MASTER_ADMIN_EMAILS: 'derik@crias.ai' } as NodeJS.ProcessEnv,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.status).toBe(401)
  })

  it('1) Master (MASTER_ADMIN_EMAILS, trim+case) → todas as instituições', async () => {
    verifyIdToken.mockResolvedValue({
      email: ' Derik@Crias.ai ',
      uid: 'u1',
    })
    const r = await requireGestaoAdminFromRequest(
      mockDb([]),
      'Bearer good',
      {
        MASTER_ADMIN_EMAILS: ' derik@crias.ai , thiago@crias.ai ',
      } as NodeJS.ProcessEnv,
    )
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.principal.isMaster).toBe(true)
      expect(r.principal.email).toBe('derik@crias.ai')
      expect(r.principal.allowedInstitutionIds).toBeNull()
      expect(canAccessInstitution(r.principal, 'i2')).toBe(true)
    }
  })

  it('2) admin_users escola → só institution_ids', async () => {
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
      { MASTER_ADMIN_EMAILS: 'derik@crias.ai' } as NodeJS.ProcessEnv,
    )
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.principal.isMaster).toBe(false)
      expect(r.principal.allowedInstitutionIds).toEqual(['i2'])
      expect(canAccessInstitution(r.principal, 'i2')).toBe(true)
      expect(canAccessInstitution(r.principal, 'i1')).toBe(false)
      expect(
        filterInstitutionsByAccess(r.principal, [
          { id: 'i1' },
          { id: 'i2' },
        ]),
      ).toEqual([{ id: 'i2' }])
    }
  })

  it('3) sem perfil e não Master → 403', async () => {
    verifyIdToken.mockResolvedValue({
      email: 'terceiro@gmail.com',
      uid: 'u3',
    })
    const r = await requireGestaoAdminFromRequest(
      mockDb([]),
      'Bearer good',
      {
        MASTER_ADMIN_EMAILS: 'derik@crias.ai,thiago@crias.ai',
      } as NodeJS.ProcessEnv,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.status).toBe(403)
      expect(r.error).toMatch(/Sem acesso/i)
    }
  })

  it('admin_users inativo → 403', async () => {
    verifyIdToken.mockResolvedValue({
      email: 'off@exemplo.com',
      uid: 'u4',
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
})
