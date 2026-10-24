import { describe, expect, it, beforeEach } from 'vitest'
import {
  clearDashboardInstitutionCache,
  getCachedInstitution,
  mergeCachedInstitutions,
  setCachedInstitution,
  type DashboardInstitutionSnapshot,
} from './dashboardInstitutionCache'
import type { Student } from '../types/student'
import type { Trail } from '../types/trail'

function snap(
  partial: Partial<DashboardInstitutionSnapshot> & {
    students: Student[]
    trails: Trail[]
  },
): DashboardInstitutionSnapshot {
  return {
    studentTrails: [],
    attempts: [],
    stages: [],
    questions: [],
    doneByStudent: new Map(),
    answerMap: new Map(),
    agentUsage: {
      periodDays: 30,
      totalMessages: 0,
      agents: [],
      series: [],
    },
    agentUsagePresent: true,
    loadedAt: Date.now(),
    ...partial,
  }
}

describe('dashboardInstitutionCache', () => {
  beforeEach(() => {
    clearDashboardInstitutionCache()
  })

  it('guarda e devolve snapshot por institution_id', () => {
    setCachedInstitution(
      'i2',
      snap({
        students: [{ id: 's1', institution_id: 'i2' } as Student],
        trails: [{ id: 't1', institution_id: 'i2' } as Trail],
      }),
    )
    expect(getCachedInstitution('i2')?.students).toHaveLength(1)
    expect(mergeCachedInstitutions(['i2'])?.students[0]?.id).toBe('s1')
  })

  it('merge exige todas as instituições no cache', () => {
    setCachedInstitution(
      'i2',
      snap({
        students: [{ id: 's1', institution_id: 'i2' } as Student],
        trails: [],
      }),
    )
    expect(mergeCachedInstitutions(['i2', 'i1'])).toBeNull()
  })

  it('merge agrega alunos de várias instituições', () => {
    setCachedInstitution(
      'i1',
      snap({
        students: [{ id: 'a', institution_id: 'i1' } as Student],
        trails: [],
      }),
    )
    setCachedInstitution(
      'i2',
      snap({
        students: [{ id: 'b', institution_id: 'i2' } as Student],
        trails: [],
      }),
    )
    const merged = mergeCachedInstitutions(['i1', 'i2'])
    expect(merged?.students.map((s) => s.id).sort()).toEqual(['a', 'b'])
  })

  it('merge de 3 instituições aquecidas fica bem abaixo de 0,5s', () => {
    for (const id of ['i1', 'i2', 'i4']) {
      setCachedInstitution(
        id,
        snap({
          students: Array.from({ length: 200 }, (_, i) => ({
            id: `${id}-s${i}`,
            institution_id: id,
          })) as Student[],
          trails: Array.from({ length: 3 }, (_, i) => ({
            id: `${id}-t${i}`,
            institution_id: id,
          })) as Trail[],
          attempts: Array.from({ length: 500 }, (_, i) => ({
            student_id: `${id}-s${i % 200}`,
            is_correct: i % 2 === 0,
          })) as DashboardInstitutionSnapshot['attempts'],
        }),
      )
    }
    const t0 = performance.now()
    for (let i = 0; i < 50; i++) {
      expect(mergeCachedInstitutions(['i1', 'i2', 'i4'])).not.toBeNull()
    }
    const ms = performance.now() - t0
    // 50 merges síncronos; alvo de troca aquecida ≪ 500ms.
    expect(ms).toBeLessThan(100)
  })

  it('HARD GATE warm: Sol L1 completo (meta+answers) merge <0,5s', () => {
    const answerMap = new Map<string, string>()
    for (let i = 0; i < 20_000; i++) {
      // Chaves únicas (espelha densidade Sol ~dezenas de milhares).
      answerMap.set(`s${i % 400}|t1|${(i % 12) + 1}|${i}`, 'A')
    }
    setCachedInstitution(
      'i2',
      snap({
        students: Array.from({ length: 400 }, (_, i) => ({
          id: `s${i}`,
          institution_id: 'i2',
          active: true,
        })) as Student[],
        trails: [
          { id: 't1', institution_id: 'i2', active: true } as Trail,
          { id: 't2', institution_id: 'i2', active: true } as Trail,
        ],
        stages: Array.from({ length: 24 }, (_, i) => ({
          id: `st${i}`,
          trail_id: i < 12 ? 't1' : 't2',
          stage_number: (i % 12) + 1,
          stage_type: 'exercise',
        })) as DashboardInstitutionSnapshot['stages'],
        questions: Array.from({ length: 360 }, (_, i) => ({
          id: `q${i}`,
          trail_id: i < 180 ? 't1' : 't2',
          stage_number: (i % 12) + 1,
          question_number: (i % 15) + 1,
          correct_option: 'A',
        })) as DashboardInstitutionSnapshot['questions'],
        answerMap,
        doneByStudent: new Map(),
      }),
    )
    const t0 = performance.now()
    const merged = mergeCachedInstitutions(['i2'])
    const ms = performance.now() - t0
    expect(merged).not.toBeNull()
    expect(merged!.stages.length).toBeGreaterThan(0)
    expect(merged!.questions.length).toBeGreaterThan(0)
    expect(merged!.answerMap.size).toBe(20_000)
    expect(ms).toBeLessThan(500)
    // eslint-disable-next-line no-console
    console.info(`[timing] Sol L1 warm merge ${ms.toFixed(1)}ms`)
  })
})
