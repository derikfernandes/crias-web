import { describe, expect, it, vi } from 'vitest'

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    getUserByEmail: vi.fn(),
    createUser: vi.fn(),
  }),
}))

vi.mock('./masterAuth.js', () => ({
  isMasterEmail: vi.fn(async (_db: unknown, email: string) =>
    email === 'master@crias.ai',
  ),
}))

vi.mock('./gestaoAdminAuth.js', () => ({
  loadAdminUserByEmail: vi.fn(async (_db: unknown, email: string) => {
    if (email === 'gestor@escola.org') {
      return {
        active: true,
        is_master: false,
        is_super_admin: false,
        all_institutions: false,
        institution_ids: ['i1'],
      }
    }
    if (email === 'inativo@escola.org') {
      return {
        active: false,
        is_master: false,
        is_super_admin: false,
        all_institutions: false,
        institution_ids: ['i1'],
      }
    }
    return null
  }),
}))

import { emailHasGestaoRole, resolveUnifiedRoles } from './unifiedEmailAuth.js'

function fakeDb(students: Array<{ id: string; data: Record<string, unknown> }>) {
  return {
    collection(name: string) {
      if (name === 'students') {
        return {
          where() {
            return {
              limit() {
                return {
                  async get() {
                    return {
                      docs: students.map((s) => ({
                        id: s.id,
                        data: () => s.data,
                      })),
                    }
                  },
                }
              },
            }
          },
        }
      }
      if (name === 'institutions') {
        return {
          doc(id: string) {
            return {
              async get() {
                return {
                  exists: true,
                  data: () => ({ name: `Escola ${id}` }),
                }
              },
            }
          },
        }
      }
      throw new Error(`unexpected collection ${name}`)
    },
  } as unknown as import('firebase-admin/firestore').Firestore
}

describe('unifiedEmailAuth roles', () => {
  it('só aluno', async () => {
    const db = fakeDb([
      {
        id: 's1',
        data: {
          email: 'aluno@x.com',
          institution_id: 'i4',
          name: 'Ana',
          phone_number: '5511999999999',
          active: true,
        },
      },
    ])
    const r = await resolveUnifiedRoles(db, 'Aluno@X.com')
    expect(r.status).toBe('ok')
    if (r.status !== 'ok') return
    expect(r.roles).toEqual({ student: true, gestao: false })
    expect(r.student?.student_id).toBe('s1')
  })

  it('só gestor (Master)', async () => {
    const db = fakeDb([])
    const r = await resolveUnifiedRoles(db, 'master@crias.ai')
    expect(r.status).toBe('ok')
    if (r.status !== 'ok') return
    expect(r.roles).toEqual({ student: false, gestao: true })
    expect(r.student).toBeNull()
  })

  it('ambos: aluno + admin_users', async () => {
    const db = fakeDb([
      {
        id: 's9',
        data: {
          email: 'gestor@escola.org',
          institution_id: 'i1',
          name: 'Geo',
          active: true,
        },
      },
    ])
    const r = await resolveUnifiedRoles(db, 'gestor@escola.org')
    expect(r.status).toBe('ok')
    if (r.status !== 'ok') return
    expect(r.roles).toEqual({ student: true, gestao: true })
  })

  it('multi-escola → needs_institution', async () => {
    const db = fakeDb([
      {
        id: 's1',
        data: { email: 'a@b.co', institution_id: 'i1', name: 'A', active: true },
      },
      {
        id: 's2',
        data: { email: 'a@b.co', institution_id: 'i2', name: 'A', active: true },
      },
    ])
    const r = await resolveUnifiedRoles(db, 'a@b.co')
    expect(r.status).toBe('needs_institution')
  })

  it('admin inativo não é gestor', async () => {
    expect(await emailHasGestaoRole(fakeDb([]), 'inativo@escola.org')).toBe(
      false,
    )
  })
})
