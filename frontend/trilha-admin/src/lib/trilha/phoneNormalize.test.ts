import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import {
  isValidCanonicalPhone,
  phoneLookupVariants,
  stripPhoneDigits,
  toCanonicalPhone,
} from './phoneNormalize'

const TEST_PHONE = '5512974085258'
const TEST_LOCAL = '12974085258'

describe('FE phoneNormalize — telefone de teste', () => {
  it('strip remove máscara', () => {
    expect(stripPhoneDigits('+55 (12) 97408-5258')).toBe(TEST_PHONE)
  })

  it('canónico 13 dígitos', () => {
    const r = toCanonicalPhone(TEST_PHONE)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.canonical).toBe(TEST_PHONE)
  })

  it('local 11 → 55…', () => {
    const r = toCanonicalPhone(TEST_LOCAL)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.canonical).toBe(TEST_PHONE)
  })

  it('lookup Q → sem 55', () => {
    const { variants } = phoneLookupVariants(TEST_PHONE)
    expect(variants[0]).toBe(TEST_PHONE)
    expect(variants).toContain(TEST_LOCAL)
    expect(variants.indexOf(TEST_PHONE)).toBeLessThan(
      variants.indexOf(TEST_LOCAL),
    )
  })

  it('lookup local → com 55', () => {
    const { variants } = phoneLookupVariants(TEST_LOCAL)
    expect(variants[0]).toBe(TEST_LOCAL)
    expect(variants).toContain(TEST_PHONE)
  })

  it('isValidCanonicalPhone', () => {
    expect(isValidCanonicalPhone(TEST_PHONE)).toBe(true)
    expect(isValidCanonicalPhone(TEST_LOCAL)).toBe(false)
  })
})

describe('paridade com server/lib/trail-engine/phoneNormalize.ts', () => {
  it('fonte FE espelha exports e lógica canónica do server', () => {
    // .../src/lib/trilha → repo root
    const root = join(dirname(fileURLToPath(import.meta.url)), '../../../../../')
    const serverSrc = readFileSync(
      join(root, 'server/lib/trail-engine/phoneNormalize.ts'),
      'utf8',
    )
    const feSrc = readFileSync(
      join(root, 'frontend/trilha-admin/src/lib/trilha/phoneNormalize.ts'),
      'utf8',
    )

    for (const marker of [
      'stripPhoneDigits',
      'toCanonicalPhone',
      'phoneLookupVariants',
      'isValidCanonicalPhone',
      "digits.startsWith('55') && (digits.length === 12 || digits.length === 13)",
      'push(query.slice(2))',
      'push(`55${query}`)',
    ]) {
      expect(serverSrc.includes(marker), `server falta: ${marker}`).toBe(true)
      expect(feSrc.includes(marker), `FE falta: ${marker}`).toBe(true)
    }
  })
})
