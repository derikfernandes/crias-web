import { describe, expect, it } from 'vitest'
import { sameIdSet } from './sameIdSet'

describe('sameIdSet', () => {
  it('true para o mesmo conteúdo em Sets distintos', () => {
    expect(sameIdSet(new Set(['i1', 'i2']), new Set(['i2', 'i1']))).toBe(true)
  })

  it('false quando difere ou prev é null', () => {
    expect(sameIdSet(null, new Set(['i1']))).toBe(false)
    expect(sameIdSet(new Set(['i1']), new Set(['i2']))).toBe(false)
    expect(sameIdSet(new Set(['i1']), new Set(['i1', 'i2']))).toBe(false)
  })
})
