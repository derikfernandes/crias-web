import { describe, expect, it } from 'vitest'
import {
  activityProgressPct,
  formatAtividadeLabel,
  formatPassoLabel,
  formatTrailChromeProgress,
} from './trailProgressLabel'

describe('trailProgressLabel', () => {
  it('formata Atividade X de Y', () => {
    expect(formatAtividadeLabel(2, 7)).toBe('Atividade 2 de 7')
    expect(formatAtividadeLabel(1, null)).toBe('Atividade 1')
  })

  it('formata Passo A de B', () => {
    expect(formatPassoLabel(4, 4)).toBe('Passo 4 de 4')
  })

  it('monta chrome Atividade · Passo', () => {
    expect(
      formatTrailChromeProgress({
        activity: 2,
        totalActivities: 7,
        step: 1,
        totalSteps: 4,
      }),
    ).toBe('Atividade 2 de 7 · Passo 1 de 4')
  })

  it('% por atividade: passo 1 = 0', () => {
    expect(
      activityProgressPct({ activity: 1, totalActivities: 7, completed: false }),
    ).toBe(0)
    expect(
      activityProgressPct({ activity: 7, totalActivities: 7, completed: true }),
    ).toBe(100)
  })
})
