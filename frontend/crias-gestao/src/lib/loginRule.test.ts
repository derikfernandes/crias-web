import { describe, expect, it } from 'vitest'
import {
  effectiveLoginIdentifier,
  loginChannelsForContact,
  looksLikeEmail,
} from './loginRule'

describe('loginRule aluno (dual phone/email)', () => {
  it('canais: só telefone, só e-mail, ambos', () => {
    expect(loginChannelsForContact({ phone: '11999990001', email: '' })).toEqual([
      'phone',
    ])
    expect(loginChannelsForContact({ phone: '', email: 'a@b.com' })).toEqual([
      'email',
    ])
    expect(
      loginChannelsForContact({ phone: '11999990001', email: 'a@b.com' }),
    ).toEqual(['phone', 'email'])
  })

  it('effectiveLoginIdentifier é só preferência visual, não exclusão', () => {
    expect(
      effectiveLoginIdentifier({
        phone: '11999990001',
        email: 'a@b.com',
        chosen: 'email',
      }),
    ).toBe('email')
    expect(
      effectiveLoginIdentifier({ phone: '11999990001', email: 'a@b.com' }),
    ).toBe('phone')
    expect(effectiveLoginIdentifier({ phone: '11999990001' })).toBe('phone')
    expect(effectiveLoginIdentifier({ email: 'a@b.com' })).toBe('email')
  })

  it('looksLikeEmail', () => {
    expect(looksLikeEmail('a@b.com')).toBe(true)
    expect(looksLikeEmail('11999990001')).toBe(false)
  })
})
