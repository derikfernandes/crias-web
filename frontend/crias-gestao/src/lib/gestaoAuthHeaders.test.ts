import { beforeEach, describe, expect, it, vi } from 'vitest'

const getIdToken = vi.fn(async () => 'test-id-token')

vi.mock('./firebase', () => ({
  auth: {
    get currentUser() {
      return currentUser
    },
  },
}))

let currentUser: { getIdToken: typeof getIdToken } | null = {
  getIdToken,
}

import { gestaoAuthHeaders } from './gestaoAuthHeaders'

describe('gestaoAuthHeaders', () => {
  beforeEach(() => {
    getIdToken.mockClear()
    currentUser = { getIdToken }
  })

  it('envia Authorization Bearer com o ID token', async () => {
    const headers = await gestaoAuthHeaders({ Accept: 'application/json' })
    expect(headers.Authorization).toBe('Bearer test-id-token')
    expect(headers.Accept).toBe('application/json')
    expect(getIdToken).toHaveBeenCalledTimes(1)
  })

  it('falha sem usuário logado', async () => {
    currentUser = null
    await expect(gestaoAuthHeaders()).rejects.toThrow(/login/i)
  })
})
