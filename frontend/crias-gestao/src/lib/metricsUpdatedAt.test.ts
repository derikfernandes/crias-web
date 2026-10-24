import { describe, expect, it } from 'vitest'
import {
  formatAtualizadoAs,
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
