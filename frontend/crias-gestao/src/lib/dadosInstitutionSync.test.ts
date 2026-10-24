import { describe, expect, it } from 'vitest'
import {
  shouldPinTopFilterToSelectedId,
  shouldSyncTopFilterFromUrl,
} from './dadosInstitutionSync'

describe('dadosInstitutionSync (regressão snap-back)', () => {
  it('NÃO pina o topo quando já há exatamente 1 instituição (troca Crias→Sol)', () => {
    // Antes: pinava com selectedId antigo e sobrescrevia {i2} → {i1}.
    expect(shouldPinTopFilterToSelectedId(1)).toBe(false)
  })

  it('pina o topo só quando multi ou vazio', () => {
    expect(shouldPinTopFilterToSelectedId(0)).toBe(true)
    expect(shouldPinTopFilterToSelectedId(3)).toBe(true)
  })

  it('não re-seta topo a partir da URL se já está {urlId}', () => {
    expect(shouldSyncTopFilterFromUrl('i1', new Set(['i1']))).toBe(false)
    expect(shouldSyncTopFilterFromUrl('i2', new Set(['i1']))).toBe(true)
    expect(shouldSyncTopFilterFromUrl('i2', new Set(['i1', 'i2']))).toBe(true)
    expect(shouldSyncTopFilterFromUrl(null, new Set(['i1']))).toBe(false)
  })
})
