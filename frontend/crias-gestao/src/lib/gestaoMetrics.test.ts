import { describe, expect, it } from 'vitest'
import {
  activityCountByTrail,
  activityKeysByTrail,
  accuracyFromActiveStudents,
  activeStudentsLast7Days,
  doneActivities,
  institutionMetrics,
  isActivityKeyDoneOnLink,
  isStageDoneOnLink,
  progressIndexInCatalog,
  type ActivityKey,
} from './gestaoMetrics'
import type { ExerciseAttempt } from '../types/exerciseAttempt'
import type { Student } from '../types/student'
import type { StudentTrail } from '../types/studentTrail'
import type { Trail } from '../types/trail'

/** Fixture: 2 etapas × 3 questões = 6 atividades (espelha 12×100 em miniatura). */
function multiStageCatalog(): ActivityKey[] {
  const out: ActivityKey[] = []
  for (const stage of [1, 2]) {
    for (const question of [1, 2, 3]) out.push({ stage, question })
  }
  return out
}

function makeQuestions(trailId: string, stages: number, perStage: number) {
  const rows = []
  for (let s = 1; s <= stages; s++) {
    for (let q = 1; q <= perStage; q++) {
      rows.push({
        trail_id: trailId,
        stage_number: s,
        question_number: q,
        active: true,
      })
    }
  }
  return rows
}

function link(
  partial: Partial<StudentTrail> & Pick<StudentTrail, 'trail_id' | 'status'>,
): StudentTrail {
  return {
    id: 'x',
    student_id: 's1',
    institution_id: 'i2',
    current_stage_number: 1,
    current_question_number: 1,
    started_at: null,
    completed_at: null,
    last_interaction_at: null,
    created_at: null,
    updated_at: null,
    ...partial,
  }
}

describe('activityCountByTrail / activityKeysByTrail', () => {
  it('conta pares (stage, question), não só question_number', () => {
    const qs = makeQuestions('t47', 12, 100)
    const counts = activityCountByTrail(qs)
    expect(counts.get('t47')).toBe(1200)
    const keys = activityKeysByTrail(qs).get('t47')!
    expect(keys).toHaveLength(1200)
    expect(keys[0]).toEqual({ stage: 1, question: 1 })
    expect(keys[100]).toEqual({ stage: 2, question: 1 })
    expect(keys[1199]).toEqual({ stage: 12, question: 100 })
  })

  it('ignora stage/question < 1', () => {
    const counts = activityCountByTrail([
      { trail_id: 't1', stage_number: 0, question_number: 1, active: true },
      { trail_id: 't1', stage_number: 1, question_number: 0, active: true },
      { trail_id: 't1', stage_number: 1, question_number: 1, active: true },
    ])
    expect(counts.get('t1')).toBe(1)
  })
})

describe('doneActivities / progressIndexInCatalog (multi-stage)', () => {
  const catalog = multiStageCatalog()

  it('etapa 1 questão 1 → 0 feitas', () => {
    expect(
      doneActivities(
        link({
          trail_id: 't1',
          status: 'in_progress',
          current_stage_number: 1,
          current_question_number: 1,
        }),
        catalog,
      ),
    ).toBe(0)
  })

  it('etapa 1 questão 3 → 2 feitas na etapa atual', () => {
    expect(
      doneActivities(
        link({
          trail_id: 't1',
          status: 'in_progress',
          current_stage_number: 1,
          current_question_number: 3,
        }),
        catalog,
      ),
    ).toBe(2)
  })

  it('etapa 2 questão 1 → etapa 1 completa (3) + 0 na atual', () => {
    expect(
      doneActivities(
        link({
          trail_id: 't1',
          status: 'in_progress',
          current_stage_number: 2,
          current_question_number: 1,
        }),
        catalog,
      ),
    ).toBe(3)
  })

  it('etapa 2 questão 4 (além do fim) → todas as 6', () => {
    expect(
      doneActivities(
        link({
          trail_id: 't1',
          status: 'in_progress',
          current_stage_number: 2,
          current_question_number: 4,
        }),
        catalog,
      ),
    ).toBe(6)
  })

  it('status completed NÃO força 100% se a posição ainda está no meio', () => {
    expect(
      doneActivities(
        link({
          trail_id: 't1',
          status: 'completed',
          current_stage_number: 1,
          current_question_number: 2,
        }),
        catalog,
      ),
    ).toBe(1)
  })

  it('clampa question 101 / stage 13 fora do catálogo 12×100', () => {
    const big = activityKeysByTrail(makeQuestions('t47', 12, 100)).get('t47')!
    // stage 1, question 101 → todas as 100 da etapa 1
    expect(
      progressIndexInCatalog(
        {
          status: 'in_progress',
          current_stage_number: 1,
          current_question_number: 101,
        },
        big,
      ),
    ).toBe(100)
    // stage 13 → além da última etapa → 1200
    expect(
      progressIndexInCatalog(
        {
          status: 'in_progress',
          current_stage_number: 13,
          current_question_number: 1,
        },
        big,
      ),
    ).toBe(1200)
  })
})

describe('isActivityKeyDoneOnLink / isStageDoneOnLink', () => {
  const catalog = multiStageCatalog()
  const mid = link({
    trail_id: 't1',
    status: 'in_progress',
    current_stage_number: 2,
    current_question_number: 2,
  })

  it('marca E1 A* como feitas e E2 A1 feita, E2 A2 não', () => {
    expect(isActivityKeyDoneOnLink(mid, { stage: 1, question: 3 }, catalog)).toBe(
      true,
    )
    expect(isActivityKeyDoneOnLink(mid, { stage: 2, question: 1 }, catalog)).toBe(
      true,
    )
    expect(isActivityKeyDoneOnLink(mid, { stage: 2, question: 2 }, catalog)).toBe(
      false,
    )
  })

  it('etapa 1 concluída; etapa 2 não', () => {
    expect(isStageDoneOnLink(mid, 1, catalog)).toBe(true)
    expect(isStageDoneOnLink(mid, 2, catalog)).toBe(false)
  })

  it('ignora atividade fora do catálogo', () => {
    expect(
      isActivityKeyDoneOnLink(mid, { stage: 1, question: 99 }, catalog),
    ).toBe(false)
  })
})

describe('institutionMetrics acerto (regressão Sol 86% vs 68%)', () => {
  it('inclui tentativas de trilhas inativas da instituição', () => {
    const students = [
      { id: 's1', institution_id: 'i2', active: true },
    ] as import('../types/student').Student[]
    const trails = [
      { id: 't-active', institution_id: 'i2', active: true },
      { id: 't-old', institution_id: 'i2', active: false },
    ] as import('../types/trail').Trail[]
    const attempts = [
      {
        student_id: 's1',
        trail_id: 't-active',
        is_correct: true,
        stage_number: 1,
        question_number: 1,
      },
      {
        student_id: 's1',
        trail_id: 't-old',
        is_correct: false,
        stage_number: 1,
        question_number: 1,
      },
      {
        student_id: 's1',
        trail_id: 't-old',
        is_correct: false,
        stage_number: 1,
        question_number: 2,
      },
    ] as import('../types/exerciseAttempt').ExerciseAttempt[]
    const m = institutionMetrics({
      institutionId: 'i2',
      students,
      trails,
      studentTrails: [],
      activityTotals: new Map([['t-active', 1]]),
      attempts,
    })
    // 1 certo + 2 errados = 33,3%. Só ativa daria 100% (bug antigo ~86% Sol).
    expect(m.avgAccuracy).toBe(33.3)
  })
})

describe('accuracyFromActiveStudents (unifica Início/Dados)', () => {
  it('conta por student_id dos ativos, sem exigir institution_id na tentativa', () => {
    const attempts = [
      {
        student_id: 's1',
        institution_id: '',
        trail_id: 't1',
        is_correct: true,
        stage_number: 1,
        question_number: 1,
      },
      {
        student_id: 's1',
        institution_id: 'i2',
        trail_id: 't1',
        is_correct: false,
        stage_number: 1,
        question_number: 2,
      },
      {
        student_id: 's9',
        institution_id: 'i2',
        trail_id: 't1',
        is_correct: true,
        stage_number: 1,
        question_number: 1,
      },
    ] as ExerciseAttempt[]
    const r = accuracyFromActiveStudents({
      activeStudentIds: new Set(['s1']),
      attempts,
    })
    expect(r.tried).toBe(2)
    expect(r.correct).toBe(1)
    expect(r.avgAccuracy).toBe(50)
  })

  it('ignora stage/question < 1', () => {
    const attempts = [
      {
        student_id: 's1',
        is_correct: true,
        stage_number: 0,
        question_number: 1,
      },
      {
        student_id: 's1',
        is_correct: true,
        stage_number: 1,
        question_number: 1,
      },
    ] as ExerciseAttempt[]
    const r = accuracyFromActiveStudents({
      activeStudentIds: new Set(['s1']),
      attempts,
    })
    expect(r.tried).toBe(1)
  })
})

describe('activeStudentsLast7Days', () => {
  it('usa attempted_at das tentativas, não last_interaction_at do vínculo', () => {
    const now = Date.parse('2026-10-19T12:00:00Z')
    const recent = {
      toMillis: () => now - 2 * 24 * 60 * 60 * 1000,
    }
    const old = {
      toMillis: () => now - 30 * 24 * 60 * 60 * 1000,
    }
    const attempts = [
      {
        student_id: 's1',
        is_correct: true,
        attempted_at: recent,
        created_at: null,
        updated_at: null,
      },
      {
        student_id: 's2',
        is_correct: true,
        attempted_at: old,
        created_at: null,
        updated_at: null,
      },
    ] as unknown as ExerciseAttempt[]
    expect(
      activeStudentsLast7Days({
        activeStudentIds: new Set(['s1', 's2', 's3']),
        attempts,
        now,
      }),
    ).toBe(1)
  })
})

describe('institutionMetrics multi-stage', () => {
  it('conclusão média e Concluiu usam catálogo (stage, question)', () => {
    const catalog = activityKeysByTrail(makeQuestions('t1', 2, 3))
    const totals = activityCountByTrail(makeQuestions('t1', 2, 3))
    expect(totals.get('t1')).toBe(6)

    const students = [
      {
        id: 's1',
        institution_id: 'i2',
        active: true,
      },
      {
        id: 's2',
        institution_id: 'i2',
        active: true,
      },
    ] as Student[]

    const trails = [
      { id: 't1', institution_id: 'i2', active: true, name: 'T' },
    ] as Trail[]

    // s1: meio da etapa 2 (3 da etapa 1 + 1) = 4/6
    // s2: status completed mas posição no início → 0/6 (não conta como concluiu)
    const studentTrails = [
      link({
        student_id: 's1',
        trail_id: 't1',
        status: 'in_progress',
        current_stage_number: 2,
        current_question_number: 2,
      }),
      link({
        student_id: 's2',
        trail_id: 't1',
        status: 'completed',
        current_stage_number: 1,
        current_question_number: 1,
      }),
    ]

    const m = institutionMetrics({
      institutionId: 'i2',
      students,
      trails,
      studentTrails,
      activityTotals: totals,
      activityCatalogs: catalog,
      attempts: [],
    })

    // done = 4 + 0 = 4; total = 6+6 = 12 → 33,3%
    expect(m.avgCompletion).toBe(33.3)
    expect(m.completed).toBe(0)
    expect(m.inProgress).toBe(2)
  })
})
