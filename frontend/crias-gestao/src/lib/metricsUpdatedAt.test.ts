import { describe, expect, it } from 'vitest'
import {
  formatAtualizadoAs,
  nextPinnedComputedAt,
  oldestComputedAt,
} from './metricsUpdatedAt'

describe('formatAtualizadoAs', () => {
  it('formata HH:MM em Brasília sem travessão', () => {
    // 2026-03-15 17:05 UTC = 14:05 em Brasília (UTC-3)
    const label = formatAtualizadoAs(Date.parse('2026-03-15T17:05:00.000Z'))
    expect(label).toBe('Atualizado às 14:05')
  })

  it('null para ausente', () => {
    expect(formatAtualizadoAs(null)).toBeNull()
    expect(formatAtualizadoAs(0)).toBeNull()
  })
})

describe('oldestComputedAt', () => {
  it('escolhe o mais antigo', () => {
    expect(oldestComputedAt([300, 100, 200])).toBe(100)
    expect(oldestComputedAt([null, 50])).toBe(50)
    expect(oldestComputedAt([])).toBeNull()
  })
})

describe('nextPinnedComputedAt', () => {
  it('pina no 1º settle e ignora SWR mais novo', () => {
    const first = nextPinnedComputedAt({
      scopeKey: 'i2',
      liveOldest: 100,
      pinned: null,
    })
    expect(first).toEqual({ key: 'i2', ms: 100 })
    const afterSwr = nextPinnedComputedAt({
      scopeKey: 'i2',
      liveOldest: 200,
      pinned: first,
    })
    expect(afterSwr).toEqual({ key: 'i2', ms: 100 })
  })

  it('durante force não re-pina o valor velho', () => {
    const pinned = { key: 'i2', ms: 100 }
    expect(
      nextPinnedComputedAt({
        scopeKey: 'i2',
        liveOldest: 100,
        pinned: null,
        forceInFlight: true,
      }),
    ).toBeNull()
    expect(
      nextPinnedComputedAt({
        scopeKey: 'i2',
        liveOldest: 100,
        pinned,
        forceInFlight: true,
      }),
    ).toEqual(pinned)
  })

  it('após force adota o novo oldest', () => {
    expect(
      nextPinnedComputedAt({
        scopeKey: 'i2',
        liveOldest: 500,
        pinned: { key: 'i2', ms: 100 },
        adoptAfterForce: true,
      }),
    ).toEqual({ key: 'i2', ms: 500 })
  })
})
