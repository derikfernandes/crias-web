import { describe, expect, it } from 'vitest'
import {
  assertAnuladasExcludedFromAccuracy,
  computeInstitutionDashboardMetrics,
  mergeInstitutionMetrics,
  SOL_ANNULLED_EXERCISE_KEYS,
} from './dashboardInstitutionMetrics'

const emptyAgent = {
  period_days: 0,
  total_messages: 0,
  agents: [],
  series: [],
}

describe('computeInstitutionDashboardMetrics', () => {
  it('calcula acerto 68,8% e exercise_count estável', () => {
    const trailIds = ['t1']
    // 10 respostas: 7 certas, 3 erradas → 70%
    const studentsMap = {
      s1: {
        answers: {
          '0|1|1': 'A',
          '0|1|2': 'A',
          '0|1|3': 'B',
          '0|1|4': 'A',
          '0|1|5': 'A',
          '0|1|6': 'A',
          '0|1|7': 'A',
          '0|1|8': 'C',
          '0|1|9': 'A',
          '0|1|10': 'D',
        },
        extra_done: [],
      },
    }
    const questions = Array.from({ length: 10 }, (_, i) => ({
      trail_id: 't1',
      stage_number: 1,
      question_number: i + 1,
      correct_option: 'A',
      title: `Q${i + 1}`,
    }))
    const m = computeInstitutionDashboardMetrics({
      institutionId: 'i2',
      trailIds,
      studentsMap,
      students: [{ id: 's1', name: 'Ana', active: true }],
      trails: [{ id: 't1', name: 'Trilha', active: true }],
      studentTrails: [{ student_id: 's1', trail_id: 't1', status: 'in_progress' }],
      questions,
      stages: [{ trail_id: 't1', stage_number: 1, stage_type: 'exercise' }],
      agentUsageByPeriod: {
        '0': { ...emptyAgent, period_days: 0 },
        '7': { ...emptyAgent, period_days: 7 },
        '30': { ...emptyAgent, period_days: 30 },
      },
    })
    expect(m.accuracy_correct).toBe(7)
    expect(m.accuracy_tried).toBe(10)
    expect(m.avg_accuracy).toBe(70)
    expect(m.exercise_count).toBe(10)
    expect(m.exercise_pills).toHaveLength(10)
  })

  it('merge multi-instituição pondera correct/tried', () => {
    const a = computeInstitutionDashboardMetrics({
      institutionId: 'i2',
      trailIds: ['t1'],
      studentsMap: {
        s1: { answers: { '0|1|1': 'A', '0|1|2': 'A' }, extra_done: [] },
      },
      students: [{ id: 's1', active: true }],
      trails: [{ id: 't1', active: true }],
      studentTrails: [{ student_id: 's1', trail_id: 't1' }],
      questions: [
        { trail_id: 't1', stage_number: 1, question_number: 1, correct_option: 'A' },
        { trail_id: 't1', stage_number: 1, question_number: 2, correct_option: 'A' },
      ],
      stages: [],
      agentUsageByPeriod: {
        '0': emptyAgent,
        '7': emptyAgent,
        '30': emptyAgent,
      },
    })
    const b = computeInstitutionDashboardMetrics({
      institutionId: 'i4',
      trailIds: ['t2'],
      studentsMap: {
        s2: { answers: { '0|1|1': 'B' }, extra_done: [] },
      },
      students: [{ id: 's2', active: true }],
      trails: [{ id: 't2', active: true }],
      studentTrails: [{ student_id: 's2', trail_id: 't2' }],
      questions: [
        { trail_id: 't2', stage_number: 1, question_number: 1, correct_option: 'A' },
      ],
      stages: [],
      agentUsageByPeriod: {
        '0': emptyAgent,
        '7': emptyAgent,
        '30': emptyAgent,
      },
    })
    const merged = mergeInstitutionMetrics([a, b])
    expect(merged.accuracy_correct).toBe(2)
    expect(merged.accuracy_tried).toBe(3)
    expect(merged.avg_accuracy).toBe(66.7)
    expect(merged.exercise_count).toBe(3)
  })

  it('exclui células anuladas (annulled / annulled_at) do denominador', () => {
    // t47|7|15, 7|16, 7|52: canônicas Sol — respostas NÃO entram no acerto.
    const trailIds = ['t47']
    const studentsMap = {
      s1: {
        answers: {
          '0|7|1': 'A', // válida
          '0|7|15': 'B', // anulada
          '0|7|16': 'A', // anulada
          '0|7|52': 'C', // anulada
        },
        extra_done: [],
      },
    }
    const questions = [
      {
        trail_id: 't47',
        stage_number: 7,
        question_number: 1,
        correct_option: 'A',
        title: 'Q1',
      },
      {
        trail_id: 't47',
        stage_number: 7,
        question_number: 15,
        correct_option: 'A',
        annulled: true,
        title: 'Anulada 15',
      },
      {
        trail_id: 't47',
        stage_number: 7,
        question_number: 16,
        correct_option: 'A',
        annulled_at: { seconds: 1 },
        title: 'Anulada 16',
      },
      {
        trail_id: 't47',
        stage_number: 7,
        question_number: 52,
        correct_option: 'A',
        annulled: true,
        annulled_at: { seconds: 2 },
        title: 'Anulada 52',
      },
    ]
    const m = computeInstitutionDashboardMetrics({
      institutionId: 'i2',
      trailIds,
      studentsMap,
      students: [{ id: 's1', name: 'Ana', active: true }],
      trails: [{ id: 't47', name: 'Sol', active: true }],
      studentTrails: [
        { student_id: 's1', trail_id: 't47', status: 'in_progress' },
      ],
      questions,
      stages: [{ trail_id: 't47', stage_number: 7, stage_type: 'exercise' }],
      agentUsageByPeriod: {
        '0': { ...emptyAgent, period_days: 0 },
        '7': { ...emptyAgent, period_days: 7 },
        '30': { ...emptyAgent, period_days: 30 },
      },
    })
    expect(m.accuracy_correct).toBe(1)
    expect(m.accuracy_tried).toBe(1)
    expect(m.annulled_answers_excluded).toBe(3)
    expect(m.avg_accuracy).toBe(100)
    expect(m.exercise_pills.map((p) => p.key)).toEqual(['t47|7|1'])
    expect(() => assertAnuladasExcludedFromAccuracy(m)).not.toThrow()
  })

  it('assertAnuladasExcludedFromAccuracy falha se pill anulada entrar', () => {
    const m = computeInstitutionDashboardMetrics({
      institutionId: 'i2',
      trailIds: ['t47'],
      studentsMap: {
        s1: { answers: { '0|7|15': 'A' }, extra_done: [] },
      },
      students: [{ id: 's1', active: true }],
      trails: [{ id: 't47', active: true }],
      studentTrails: [{ student_id: 's1', trail_id: 't47' }],
      // Sem flag anulada → entra no denominador (regressão).
      questions: [
        {
          trail_id: 't47',
          stage_number: 7,
          question_number: 15,
          correct_option: 'A',
        },
      ],
      stages: [],
      agentUsageByPeriod: {
        '0': emptyAgent,
        '7': emptyAgent,
        '30': emptyAgent,
      },
    })
    expect(m.exercise_pills.some((p) => p.key === 't47|7|15')).toBe(true)
    expect(() =>
      assertAnuladasExcludedFromAccuracy(m, SOL_ANNULLED_EXERCISE_KEYS),
    ).toThrow(/anuladas/)
  })
})
