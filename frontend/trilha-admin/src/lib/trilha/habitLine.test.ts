import { describe, expect, it } from 'vitest'
import { habitLineFromAttempts } from './habitLine'

describe('habitLineFromAttempts', () => {
  it('mensagem gentil sem attempts', () => {
    expect(habitLineFromAttempts([])).toMatch(/sem pressão/i)
  })

  it('conta passos de hoje', () => {
    const now = new Date('2026-09-21T15:00:00')
    expect(
      habitLineFromAttempts(['2026-09-21T10:00:00Z'], now),
    ).toMatch(/Hoje: 1 passo/)
  })

  it('sem passo hoje', () => {
    const now = new Date('2026-09-21T15:00:00')
    expect(
      habitLineFromAttempts(['2026-09-20T10:00:00Z'], now),
    ).toMatch(/Ainda sem passo hoje/)
  })
})
