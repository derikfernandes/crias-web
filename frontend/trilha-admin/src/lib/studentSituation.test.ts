import { describe, expect, it } from 'vitest'
import { situationFromProgress, isStalledSince } from './studentSituation'

describe('situationFromProgress', () => {
  const now = Date.parse('2026-09-26T12:00:00Z')

  it('marca concluído', () => {
    expect(
      situationFromProgress({
        status: 'completed',
        completionPct: 100,
        nowMs: now,
      }).key,
    ).toBe('completed')
  })

  it('prioriza parado 7+ dias sobre faixa', () => {
    const eightDaysAgo = now - 8 * 24 * 60 * 60 * 1000
    expect(
      situationFromProgress({
        status: 'in_progress',
        completionPct: 50,
        lastInteractionAtMs: eightDaysAgo,
        nowMs: now,
      }).key,
    ).toBe('stalled')
  })

  it('classifica faixas início/meio/final', () => {
    expect(
      situationFromProgress({
        status: 'in_progress',
        completionPct: 20,
        lastInteractionAtMs: now,
        nowMs: now,
      }).key,
    ).toBe('start')
    expect(
      situationFromProgress({
        status: 'in_progress',
        completionPct: 50,
        lastInteractionAtMs: now,
        nowMs: now,
      }).key,
    ).toBe('mid')
    expect(
      situationFromProgress({
        status: 'in_progress',
        completionPct: 80,
        lastInteractionAtMs: now,
        nowMs: now,
      }).key,
    ).toBe('final')
  })

  it('isStalledSince', () => {
    expect(isStalledSince(now - 8 * 86400000, now)).toBe(true)
    expect(isStalledSince(now - 2 * 86400000, now)).toBe(false)
    expect(isStalledSince(null, now)).toBe(false)
  })
})
