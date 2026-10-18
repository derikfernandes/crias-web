import { describe, expect, it } from 'vitest'
import {
  mergeAgentRowsByLabel,
  messagesPerTutorPerDay,
  type AgentUsageRowView,
} from './agentUsage'

function row(partial: Partial<AgentUsageRowView> & Pick<AgentUsageRowView, 'trailId' | 'label'>): AgentUsageRowView {
  return {
    trailIds: [partial.trailId],
    messages: 0,
    uniqueStudents: 0,
    pctOfTotal: 0,
    lastActivity: null,
    studentIds: [],
    studentStats: [],
    ...partial,
  }
}

describe('mergeAgentRowsByLabel', () => {
  it('soma aliases Trilha/Tutor da mesma disciplina', () => {
    const merged = mergeAgentRowsByLabel([
      row({
        trailId: 'Trilha - Matemática',
        label: 'Matemática',
        messages: 397,
        studentIds: ['s1'],
        studentStats: [
          { studentId: 's1', messages: 397, lastActivity: '2026-09-19T10:00:00.000Z' },
        ],
      }),
      row({
        trailId: 'Tutor - Matemática',
        label: 'Matemática',
        messages: 393,
        studentIds: ['s1', 's2'],
        studentStats: [
          { studentId: 's1', messages: 200, lastActivity: '2026-09-19T12:00:00.000Z' },
          { studentId: 's2', messages: 193, lastActivity: '2026-09-18T09:00:00.000Z' },
        ],
      }),
    ])

    const math = merged.filter((a) => a.label === 'Matemática')
    expect(math).toHaveLength(1)
    expect(math[0]?.messages).toBe(790)
    expect(math[0]?.trailId).toBe('Trilha - Matemática')
    expect(math[0]?.trailIds.sort()).toEqual([
      'Trilha - Matemática',
      'Tutor - Matemática',
    ])
    expect(math[0]?.uniqueStudents).toBe(2)
    expect(math[0]?.studentStats.find((s) => s.studentId === 's1')?.messages).toBe(597)
  })
})

describe('messagesPerTutorPerDay (FE)', () => {
  it('calcula média simples', () => {
    expect(
      messagesPerTutorPerDay({
        totalMessages: 900,
        activeTutorCount: 3,
        periodDays: 30,
        activeDayCount: 12,
      }),
    ).toBe(10)
  })

  it('Todo o período usa dias de calendário da série (não só dias com msg)', () => {
    // 10 msgs, 1 tutor, série de 1 a 10 (10 dias) → 1,0/dia
    expect(
      messagesPerTutorPerDay({
        totalMessages: 10,
        activeTutorCount: 1,
        periodDays: 0,
        activeDayCount: 2,
        seriesDates: ['2026-01-01', '2026-01-10'],
      }),
    ).toBe(1)
  })
})
