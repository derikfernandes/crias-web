import { describe, expect, it } from 'vitest'

import {
  authorizeStudentResource,
  extractBearerToken,
  getStudentSessionSecret,
  issueStudentSessionToken,
  resolveAuthPrincipal,
  verifyStudentSessionToken,
} from './studentAuth'

describe('studentAuth session token', () => {
  const env = {
    STUDENT_SESSION_SECRET: 'test-secret-wave-b',
    TRAIL_ENGINE_SERVICE_TOKEN: 'service-token-chatis',
  }

  it('emite e verifica sessão ligada a sN', () => {
    const { token, claims } = issueStudentSessionToken(
      {
        student_id: 's42',
        institution_id: 'i1',
        name: 'Aluno Teste',
        phone_number: '5512974085258',
      },
      env,
      1_700_000_000,
    )
    expect(claims.student_id).toBe('s42')
    const verified = verifyStudentSessionToken(token, env, 1_700_000_000)
    expect(verified?.student_id).toBe('s42')
    expect(verified?.phone_number).toBe('5512974085258')
  })

  it('rejeita token expirado', () => {
    const { token } = issueStudentSessionToken(
      {
        student_id: 's1',
        institution_id: 'i1',
        name: 'X',
        phone_number: '5512974085258',
        ttlSeconds: 10,
      },
      env,
      1000,
    )
    expect(verifyStudentSessionToken(token, env, 1020)).toBeNull()
  })

  it('rejeita assinatura adulterada', () => {
    const { token } = issueStudentSessionToken(
      {
        student_id: 's1',
        institution_id: 'i1',
        name: 'X',
        phone_number: '5512974085258',
      },
      env,
    )
    const bad = token.slice(0, -2) + 'ab'
    expect(verifyStudentSessionToken(bad, env)).toBeNull()
  })
})

describe('AuthZ I8 — aluno não acede a outro sN', () => {
  const env = {
    STUDENT_SESSION_SECRET: 'test-secret-wave-b',
    TRAIL_ENGINE_SERVICE_TOKEN: 'service-token-chatis',
  }

  it('service bearer é permitido para qualquer student_id', () => {
    const principal = resolveAuthPrincipal(
      'Bearer service-token-chatis',
      env,
    )
    expect(principal.kind).toBe('service')
    expect(authorizeStudentResource(principal, 's99')).toEqual({ ok: true })
  })

  it('aluno só no próprio student_id', () => {
    const { token } = issueStudentSessionToken(
      {
        student_id: 's7',
        institution_id: 'i1',
        name: 'A',
        phone_number: '5512974085258',
      },
      env,
    )
    const principal = resolveAuthPrincipal(`Bearer ${token}`, env)
    expect(principal.kind).toBe('student')
    expect(authorizeStudentResource(principal, 's7')).toEqual({ ok: true })
    const denied = authorizeStudentResource(principal, 's8')
    expect(denied.ok).toBe(false)
    if (!denied.ok) {
      expect(denied.status).toBe(403)
      expect(denied.code).toBe('forbidden')
    }
  })

  it('anonymous → 401', () => {
    const principal = resolveAuthPrincipal(null, env)
    const denied = authorizeStudentResource(principal, 's1')
    expect(denied.ok).toBe(false)
    if (!denied.ok) expect(denied.status).toBe(401)
  })

  it('extractBearerToken', () => {
    expect(extractBearerToken('Bearer abc')).toBe('abc')
    expect(extractBearerToken('Basic x')).toBeNull()
  })

  it('produção sem STUDENT_SESSION_SECRET falha fechado (RT-M3)', () => {
    expect(() =>
      getStudentSessionSecret({
        NODE_ENV: 'production',
      } as NodeJS.ProcessEnv),
    ).toThrow(/STUDENT_SESSION_SECRET/)
  })
})
