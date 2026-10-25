import { describe, expect, it } from 'vitest'
import {
  formatInstParam,
  parseInstParam,
  shouldPinTopFilterToSelectedId,
  shouldRestoreTopFilterWhenEmpty,
  shouldSyncTopFilterFromUrl,
  shouldSyncTopFilterFromUrlIds,
  toggleIdInSet,
} from './dadosInstitutionSync'

describe('dadosInstitutionSync (checkbox multi + URL)', () => {
  it('NÃO pina/colapsa quando há 2+ instituições (regressão: clico e desmarca)', () => {
    expect(shouldPinTopFilterToSelectedId(2)).toBe(false)
    expect(shouldPinTopFilterToSelectedId(3)).toBe(false)
    expect(shouldPinTopFilterToSelectedId(1)).toBe(false)
  })

  it('só restaura topo quando vazio', () => {
    expect(shouldRestoreTopFilterWhenEmpty(0)).toBe(true)
    expect(shouldRestoreTopFilterWhenEmpty(1)).toBe(false)
    expect(shouldRestoreTopFilterWhenEmpty(2)).toBe(false)
  })

  it('URL single não colapsa topo multi', () => {
    expect(shouldSyncTopFilterFromUrl('i1', new Set(['i1', 'i2']))).toBe(false)
    expect(shouldSyncTopFilterFromUrl('i1', new Set(['i1']))).toBe(false)
    expect(shouldSyncTopFilterFromUrl('i2', new Set(['i1']))).toBe(true)
  })

  it('URL multi sincroniza por conjunto', () => {
    expect(
      shouldSyncTopFilterFromUrlIds(['i1', 'i2'], new Set(['i1', 'i2'])),
    ).toBe(false)
    expect(
      shouldSyncTopFilterFromUrlIds(['i1', 'i2'], new Set(['i1'])),
    ).toBe(true)
  })

  it('URL single atrasada não colapsa topo multi (regressão checkbox)', () => {
    expect(
      shouldSyncTopFilterFromUrlIds(['i1'], new Set(['i1', 'i2'])),
    ).toBe(false)
  })

  it('parse/format inst param', () => {
    expect(parseInstParam('i2,i1,i2')).toEqual(['i2', 'i1'])
    expect(formatInstParam(['i2', 'i1'])).toBe('i1,i2')
  })

  it('toggle respeita mínimo 1', () => {
    const one = new Set(['i1'])
    expect(toggleIdInSet(one, 'i1', 1)).toBe(one)
    const two = toggleIdInSet(one, 'i2', 1)
    expect([...two].sort()).toEqual(['i1', 'i2'])
    expect([...toggleIdInSet(two, 'i2', 1)].sort()).toEqual(['i1'])
  })
})
