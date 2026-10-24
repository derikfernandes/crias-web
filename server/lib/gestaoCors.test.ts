import { describe, expect, it } from 'vitest'

import {
  gestaoCorsHeaders,
  isAllowedCorsOrigin,
  parseCorsAllowedOrigins,
} from './gestaoCors'

describe('gestaoCors', () => {
  it('nunca trata * como permitido', () => {
    expect(isAllowedCorsOrigin('*')).toBe(false)
  })

  it('aceita produção e localhost', () => {
    expect(isAllowedCorsOrigin('https://crias-web.vercel.app')).toBe(true)
    expect(isAllowedCorsOrigin('http://localhost:5173')).toBe(true)
  })

  it('aceita preview Vercel do Crias', () => {
    expect(
      isAllowedCorsOrigin(
        'https://crias-646eu2ufl-derikfernandes-projects.vercel.app',
      ),
    ).toBe(true)
    expect(
      isAllowedCorsOrigin(
        'https://crias-web-git-cursor-gestao-pain-331673-derikfernandes-projects.vercel.app',
      ),
    ).toBe(true)
  })

  it('rejeita origem arbitrária', () => {
    expect(isAllowedCorsOrigin('https://evil.example')).toBe(false)
    expect(isAllowedCorsOrigin('https://other-app.vercel.app')).toBe(false)
  })

  it('parseCorsAllowedOrigins inclui env', () => {
    const list = parseCorsAllowedOrigins({
      CORS_ALLOWED_ORIGINS: 'https://custom.example, https://outro.example/',
    } as NodeJS.ProcessEnv)
    expect(list).toContain('https://custom.example')
    expect(list).toContain('https://outro.example')
    expect(list).toContain('https://crias-web.vercel.app')
  })

  it('gestaoCorsHeaders só seta Allow-Origin quando permitido', () => {
    const ok = gestaoCorsHeaders(
      new Request('https://crias-web.vercel.app/api/x', {
        headers: { Origin: 'https://crias-web.vercel.app' },
      }),
      'GET,OPTIONS',
    )
    expect(ok['Access-Control-Allow-Origin']).toBe(
      'https://crias-web.vercel.app',
    )
    expect(ok['Access-Control-Allow-Origin']).not.toBe('*')

    const bad = gestaoCorsHeaders(
      new Request('https://crias-web.vercel.app/api/x', {
        headers: { Origin: 'https://evil.example' },
      }),
      'GET,OPTIONS',
    )
    expect(bad['Access-Control-Allow-Origin']).toBeUndefined()
  })
})
