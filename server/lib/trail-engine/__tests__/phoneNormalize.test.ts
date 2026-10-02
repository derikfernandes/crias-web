import { describe, expect, it } from 'vitest'

import {
  isValidCanonicalPhone,
  phoneLookupVariants,
  stripPhoneDigits,
  toCanonicalPhone,
} from '../phoneNormalize'

describe('stripPhoneDigits', () => {
  it('remove não-dígitos', () => {
    expect(stripPhoneDigits('+55 (12) 97408-5258')).toBe('5512974085258')
    expect(stripPhoneDigits(12974085258)).toBe('12974085258')
  })
})

describe('toCanonicalPhone', () => {
  it('aceita E.164 BR já canónico (13 dígitos celular)', () => {
    const r = toCanonicalPhone('5512974085258')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.canonical).toBe('5512974085258')
  })

  it('prefixa 55 em local 10–11', () => {
    const r11 = toCanonicalPhone('12974085258')
    expect(r11.ok).toBe(true)
    if (r11.ok) expect(r11.canonical).toBe('5512974085258')

    const r10 = toCanonicalPhone('1234567890')
    expect(r10.ok).toBe(true)
    if (r10.ok) expect(r10.canonical).toBe('551234567890')
  })

  it('rejeita vazio e comprimento inválido', () => {
    expect(toCanonicalPhone('').ok).toBe(false)
    expect(toCanonicalPhone('123').ok).toBe(false)
    expect(toCanonicalPhone('55123').ok).toBe(false)
  })
})

describe('phoneLookupVariants', () => {
  it('ordem Q → sem 55 → com 55 para telefone de teste', () => {
    const { variants } = phoneLookupVariants('5512974085258')
    expect(variants[0]).toBe('5512974085258')
    expect(variants).toContain('12974085258')
    expect(variants.indexOf('5512974085258')).toBeLessThan(
      variants.indexOf('12974085258'),
    )
  })

  it('local 11 gera variante com 55', () => {
    const { variants } = phoneLookupVariants('12974085258')
    expect(variants[0]).toBe('12974085258')
    expect(variants).toContain('5512974085258')
  })

  it('deduplica', () => {
    const { variants } = phoneLookupVariants('5512974085258')
    expect(new Set(variants).size).toBe(variants.length)
  })
})

describe('isValidCanonicalPhone', () => {
  it('valida 12–13 com 55', () => {
    expect(isValidCanonicalPhone('5512974085258')).toBe(true)
    expect(isValidCanonicalPhone('551234567890')).toBe(true)
    expect(isValidCanonicalPhone('12974085258')).toBe(false)
  })
})
