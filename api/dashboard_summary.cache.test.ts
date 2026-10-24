import { describe, expect, it } from 'vitest'

import {
  agentLogInPeriod,
  aggregateAgentUsageByPeriod,
  chunkStudentsMap,
} from './dashboard_summary'

describe('agentLogInPeriod', () => {
  it('undated (at<=0) nunca entram (nem em Todo)', () => {
    expect(agentLogInPeriod(0, 0)).toBe(false)
    expect(agentLogInPeriod(-1, 0)).toBe(false)
    expect(agentLogInPeriod(1_700_000_000_000, 0)).toBe(true)
  })

  it('period 7/30 exclui undated (at <= 0)', () => {
    const cutoff = 1_000_000
    expect(agentLogInPeriod(0, cutoff)).toBe(false)
    expect(agentLogInPeriod(-5, cutoff)).toBe(false)
  })

  it('period 7/30 inclui só at >= cutoff', () => {
    const cutoff = 1_000_000
    expect(agentLogInPeriod(999_999, cutoff)).toBe(false)
    expect(agentLogInPeriod(1_000_000, cutoff)).toBe(true)
    expect(agentLogInPeriod(2_000_000, cutoff)).toBe(true)
  })
})

describe('aggregateAgentUsageByPeriod', () => {
  it('undated não infla Todo (Crias 22→10)', () => {
    const now = 30 * 24 * 60 * 60 * 1000 + 5_000
    const logs = [
      {
        student_id: 's1',
        trail_id: 'Trilha - Matemática',
        at: 0,
      },
      {
        student_id: 's2',
        trail_id: 'Trilha - Matemática',
        at: now - 3 * 24 * 60 * 60 * 1000,
      },
      {
        student_id: 's3',
        trail_id: 'Trilha - Matemática',
        at: now - 20 * 24 * 60 * 60 * 1000,
      },
    ]

    const by = aggregateAgentUsageByPeriod(logs, now)
    expect(by['0'].total_messages).toBe(2)
    expect(by['7'].total_messages).toBe(1)
    expect(by['30'].total_messages).toBe(2)
  })
})

describe('chunkStudentsMap', () => {
  it('retorna ao menos um chunk vazio quando não há alunos', () => {
    expect(chunkStudentsMap({})).toEqual([{}])
  })

  it('mantém todos os alunos ao reagrupar', () => {
    const students: Record<
      string,
      { answers: Record<string, string>; extra_done: string[] }
    > = {}
    for (let i = 0; i < 50; i++) {
      students[`s${i}`] = {
        answers: { '0|1|1': `resp-${i}` },
        extra_done: [],
      }
    }
    const chunks = chunkStudentsMap(students)
    const merged = Object.assign({}, ...chunks)
    expect(Object.keys(merged).sort()).toEqual(Object.keys(students).sort())
  })
})
