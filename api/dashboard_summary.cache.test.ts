import { describe, expect, it } from 'vitest'

import {
  agentLogInPeriod,
  aggregateAgentUsageByPeriod,
  chunkStudentsMap,
  decodeCachePayload,
  encodeCachePayload,
  packMetricsForMeta,
  parseChunkStudents,
} from './dashboard_summary'
import type { InstitutionDashboardMetrics } from '../server/lib/dashboardInstitutionMetrics'

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

describe('encodeCachePayload / decodeCachePayload', () => {
  it('guarda JSON puro abaixo do limiar', () => {
    const enc = encodeCachePayload({ a: 1, b: ['x'] })
    expect(enc.encoding).toBeUndefined()
    expect(decodeCachePayload(enc as Record<string, unknown>)).toEqual({
      a: 1,
      b: ['x'],
    })
  })

  it('gzip quando payload grande', () => {
    const big = { blob: 'x'.repeat(900_000) }
    const enc = encodeCachePayload(big)
    expect(enc.encoding).toBe('gzip-b64')
    expect(enc.payload.length).toBeLessThan(900_000)
    expect(decodeCachePayload(enc as Record<string, unknown>)).toEqual(big)
  })
})

describe('parseChunkStudents', () => {
  it('prefer payload v2 (anti index explosion)', () => {
    const map = {
      s1: { answers: { '0|1|1': 'A' }, extra_done: [] as string[] },
    }
    const enc = encodeCachePayload(map)
    expect(parseChunkStudents(enc as Record<string, unknown>)).toEqual(map)
    expect(
      parseChunkStudents({ students_json: JSON.stringify(map) }),
    ).toEqual(map)
    expect(parseChunkStudents({ students: map })).toEqual(map)
    expect(parseChunkStudents({})).toEqual({})
  })
})

describe('packMetricsForMeta', () => {
  const emptyAgent = {
    period_days: 0,
    total_messages: 0,
    agents: [],
    series: [],
  }

  function bigMetrics(nStudents: number, nPills: number): InstitutionDashboardMetrics {
    return {
      institution_id: 'i2',
      computed_at: Date.now(),
      active_students: nStudents,
      active_trails: 3,
      avg_completion: 40,
      avg_lesson_completion: 41.9,
      avg_accuracy: 68.8,
      accuracy_correct: 1000,
      accuracy_tried: 1453,
      exercise_count: nPills,
      worst_pills: [],
      best_pills: [],
      exercise_pills: Array.from({ length: nPills }, (_, i) => ({
        key: `t|1|${i}`,
        trail_id: 't',
        trail_name: 'Trilha longa '.repeat(4),
        stage_number: 1,
        question_number: i,
        title: `Enunciado bem longo do exercício número ${i} `.repeat(3),
        gabarito: 'A',
        total: 10,
        correct: 7,
        wrong: 3,
        accuracy_pct: 70,
      })),
      stage_bars: [],
      students: Array.from({ length: nStudents }, (_, i) => ({
        id: `s${i}`,
        name: `Aluno ${i} com nome completo`,
        active: true,
        done: 10,
        released: 20,
        lessons_done: 5,
        lessons_released: 10,
        correct: 7,
        wrong: 3,
        accuracy_pct: 70,
      })),
      agent_usage_by_period: {
        '0': { ...emptyAgent, period_days: 0 },
        '7': { ...emptyAgent, period_days: 7 },
        '30': { ...emptyAgent, period_days: 30 },
      },
    }
  }

  it('cabe no meta sem sidecar quando payload é pequeno', () => {
    const packed = packMetricsForMeta(bigMetrics(5, 10), 1_000)
    expect(packed.sidecar).toBeNull()
    expect(packed.metaMetrics.metrics_sidecar).toBeFalsy()
    expect(packed.metaMetrics.students).toHaveLength(5)
  })

  it('usa sidecar quando agent gordo + metrics estourariam 1 MiB', () => {
    const packed = packMetricsForMeta(bigMetrics(800, 400), 700_000)
    expect(packed.sidecar).not.toBeNull()
    expect(packed.metaMetrics.metrics_sidecar).toBe(true)
    expect(packed.metaMetrics.exercise_pills).toEqual([])
    expect(packed.metaMetrics.students).toEqual([])
    expect(packed.sidecar!.students).toHaveLength(800)
    expect(packed.sidecar!.exercise_pills).toHaveLength(400)
    const metaSize = JSON.stringify(packed.metaMetrics).length
    expect(metaSize + 700_000).toBeLessThan(1_000_000)
  })
})
