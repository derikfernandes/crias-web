import { describe, expect, it } from 'vitest'

import {
  aggregateAgentUsage,
  agentLabelForTrailId,
  brasiliaDateKey,
  CANONICAL_AGENT_LABELS,
  CANONICAL_AGENT_TRAIL_IDS,
  isAgentTrailId,
  messagesPerTutorPerDay,
  parsePeriodDays,
  periodCutoffMillis,
} from './agentUsage'

describe('isAgentTrailId', () => {
  it('classifica os trail_ids canônicos como agente', () => {
    for (const id of CANONICAL_AGENT_TRAIL_IDS) {
      expect(isAgentTrailId(id)).toBe(true)
    }
  })

  it('não classifica tN como agente', () => {
    expect(isAgentTrailId('t1')).toBe(false)
    expect(isAgentTrailId('t12')).toBe(false)
  })

  it('aceita prefixo Tutor - / Trilha - fora da allowlist', () => {
    expect(isAgentTrailId('Tutor - Extra')).toBe(true)
    expect(isAgentTrailId('Trilha - Geografia')).toBe(true)
  })

  it('ignora vazio', () => {
    expect(isAgentTrailId('')).toBe(false)
    expect(isAgentTrailId('   ')).toBe(false)
  })
})

describe('agentLabelForTrailId', () => {
  it('usa labels canônicos em PT', () => {
    expect(agentLabelForTrailId('Trilha - Matemática')).toBe('Matemática')
    expect(agentLabelForTrailId('Tutor - Linguagens')).toBe('Linguagens')
    expect(agentLabelForTrailId('Tutor - Matemática')).toBe('Matemática')
  })
})

describe('aggregateAgentUsage', () => {
  it('separa agentes de trilhas reais e agrega volume/alunos', () => {
    const result = aggregateAgentUsage(
      [
        { student_id: 's1', trail_id: 't1', at: 1_700_000_000_000 },
        {
          student_id: 's1',
          trail_id: 'Trilha - Matemática',
          at: 1_700_000_000_000,
        },
        {
          student_id: 's2',
          trail_id: 'Trilha - Matemática',
          at: 1_700_000_100_000,
        },
        {
          student_id: 's3',
          trail_id: 'Tutor - Linguagens',
          at: 1_700_000_200_000,
        },
      ],
      0,
    )

    expect(result.total_messages).toBe(3)
    const math = result.agents.find((a) => a.label === 'Matemática')
    const ling = result.agents.find((a) => a.label === 'Linguagens')
    expect(math?.messages).toBe(2)
    expect(math?.unique_students).toBe(2)
    expect(math?.trail_id).toBe('Trilha - Matemática')
    expect(ling?.messages).toBe(1)
    expect(math?.pct_of_total).toBe(66.7)
    expect(result.agents).toHaveLength(CANONICAL_AGENT_LABELS.length)
    expect(result.agents.every((a) => a.label.length > 0)).toBe(true)
  })

  it('deduplica Trilha - X e Tutor - X na mesma disciplina', () => {
    const result = aggregateAgentUsage([
      {
        student_id: 's1',
        trail_id: 'Trilha - Matemática',
        at: 1_700_000_000_000,
      },
      {
        student_id: 's1',
        trail_id: 'Tutor - Matemática',
        at: 1_700_000_050_000,
      },
      {
        student_id: 's2',
        trail_id: 'Tutor - Matemática',
        at: 1_700_000_100_000,
      },
      {
        student_id: 's3',
        trail_id: 'Trilha - Linguagens',
        at: 1_700_000_200_000,
      },
      {
        student_id: 's3',
        trail_id: 'Tutor - Linguagens',
        at: 1_700_000_250_000,
      },
    ])

    const mathRows = result.agents.filter((a) => a.label === 'Matemática')
    const lingRows = result.agents.filter((a) => a.label === 'Linguagens')
    expect(mathRows).toHaveLength(1)
    expect(lingRows).toHaveLength(1)

    expect(mathRows[0]?.messages).toBe(2)
    expect(mathRows[0]?.unique_students).toBe(2)
    expect(mathRows[0]?.trail_id).toBe('Trilha - Matemática')
    expect(mathRows[0]?.trail_ids.sort()).toEqual([
      'Trilha - Matemática',
      'Tutor - Matemática',
    ])
    expect(mathRows[0]?.student_stats[0]?.messages).toBeGreaterThan(0)

    expect(lingRows[0]?.messages).toBe(1)
    expect(lingRows[0]?.trail_id).toBe('Tutor - Linguagens')
    expect(lingRows[0]?.trail_ids.sort()).toEqual([
      'Trilha - Linguagens',
      'Tutor - Linguagens',
    ])

    // Total = max por disciplina (não soma o espelho).
    expect(result.total_messages).toBe(3)

    const labels = result.agents.map((a) => a.label)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('inclui agentes por prefixo além da allowlist', () => {
    const result = aggregateAgentUsage([
      { student_id: 's1', trail_id: 'Tutor - Extra', at: 1_700_000_000_000 },
    ])
    expect(result.agents.some((a) => a.label === 'Extra')).toBe(true)
    expect(result.total_messages).toBe(1)
  })

  it('gera série diária agregada por disciplina (primary)', () => {
    const at = Date.parse('2026-09-18T15:00:00-03:00')
    const result = aggregateAgentUsage([
      { student_id: 's1', trail_id: 'Trilha - Matemática', at },
      { student_id: 's1', trail_id: 'Tutor - Matemática', at: at + 1000 },
    ])
    expect(result.series).toHaveLength(1)
    expect(result.series[0]?.messages).toBe(1)
    expect(result.series[0]?.trail_id).toBe('Trilha - Matemática')
    expect(brasiliaDateKey(at)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('messagesPerTutorPerDay', () => {
  it('usa periodDays quando > 0', () => {
    expect(
      messagesPerTutorPerDay({
        totalMessages: 300,
        activeTutorCount: 3,
        periodDays: 30,
        activeDayCount: 10,
      }),
    ).toBe(3.3)
  })

  it('com period 0 usa dias ativos', () => {
    expect(
      messagesPerTutorPerDay({
        totalMessages: 100,
        activeTutorCount: 2,
        periodDays: 0,
        activeDayCount: 5,
      }),
    ).toBe(10)
  })
})

describe('parsePeriodDays / periodCutoffMillis', () => {
  it('aceita 7 e 30; demais viram 0', () => {
    expect(parsePeriodDays('7')).toBe(7)
    expect(parsePeriodDays('30')).toBe(30)
    expect(parsePeriodDays('0')).toBe(0)
    expect(parsePeriodDays('9')).toBe(0)
    expect(parsePeriodDays(null)).toBe(0)
  })

  it('cutoff é 0 quando período é todo', () => {
    expect(periodCutoffMillis(0, 1_000_000)).toBe(0)
    expect(periodCutoffMillis(7, 7 * 24 * 60 * 60 * 1000)).toBe(0)
  })
})
