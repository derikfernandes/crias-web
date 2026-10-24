import { describe, expect, it } from 'vitest'
import {
  engagementFromLinks,
  accuracyFromAttempts,
  progressFromLinks,
} from './dashboardTrailProgress'
import { activityKeysByTrail, doneActivities } from './gestaoMetrics'
import type { StudentTrail } from '../types/studentTrail'
import type { ExerciseAttempt } from '../types/exerciseAttempt'

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

const catalog2x3 = activityKeysByTrail(
  [1, 2].flatMap((stage) =>
    [1, 2, 3].map((question) => ({
      trail_id: 't1',
      stage_number: stage,
      question_number: question,
      active: true,
    })),
  ),
)

describe('engagementFromLinks', () => {
  it('Concluiu só com progresso real 100% (não só status completed)', () => {
    const totals = new Map([['t1', 6]])
    expect(
      engagementFromLinks(
        [
          link({
            trail_id: 't1',
            status: 'completed',
            current_stage_number: 1,
            current_question_number: 2,
          }),
        ],
        totals,
        catalog2x3,
      ),
    ).toBe('inProgress')
  })

  it('trata 100% de atividades como Concluiu mesmo com status in_progress', () => {
    const totals = new Map([['t1', 6]])
    const status = engagementFromLinks(
      [
        link({
          trail_id: 't1',
          status: 'in_progress',
          current_stage_number: 2,
          current_question_number: 4,
        }),
      ],
      totals,
      catalog2x3,
    )
    expect(status).toBe('completed')
  })
})

describe('progressFromLinks multi-stage', () => {
  it('usa catálogo (stage, question) igual ao Início', () => {
    const totals = new Map([['t1', 6]])
    const r = progressFromLinks({
      links: [
        link({
          trail_id: 't1',
          status: 'in_progress',
          current_stage_number: 2,
          current_question_number: 2,
        }),
      ],
      activitiesByTrail: new Map([['t1', [1, 2, 3]]]),
      activityTotals: totals,
      activityCatalogs: catalog2x3,
    })
    expect(r.released).toBe(6)
    expect(r.done).toBe(4)
    expect(r.completionPct).toBe(66.7)
  })
})

describe('accuracyFromAttempts', () => {
  it('conta por student_id sem filtro de trilha (como o card)', () => {
    const attempts = [
      {
        student_id: 's1',
        trail_id: 't1',
        student_answer: '1',
        correct_option: '1',
        score: 1,
        is_correct: true,
      },
      {
        student_id: 's1',
        trail_id: 't99',
        student_answer: '2',
        correct_option: '1',
        score: 0,
        is_correct: false,
      },
      {
        student_id: 's2',
        trail_id: 't1',
        student_answer: '1',
        correct_option: '1',
        score: 1,
        is_correct: true,
      },
    ] as ExerciseAttempt[]
    const r = accuracyFromAttempts(attempts, 's1')
    expect(r.correct).toBe(1)
    expect(r.wrong).toBe(1)
  })

  it('filtra por trilha só quando o set é informado e não vazio', () => {
    const attempts = [
      {
        student_id: 's1',
        trail_id: 't1',
        student_answer: '1',
        correct_option: '1',
        score: 1,
        is_correct: true,
      },
      {
        student_id: 's1',
        trail_id: 't99',
        student_answer: '2',
        correct_option: '1',
        score: 0,
        is_correct: false,
      },
    ] as ExerciseAttempt[]
    const r = accuracyFromAttempts(attempts, 's1', new Set(['t1']))
    expect(r.correct).toBe(1)
    expect(r.wrong).toBe(0)
  })

  it('ignora Continuar / 0 e sem gabarito', () => {
    const attempts = [
      {
        student_id: 's1',
        trail_id: 't1',
        student_answer: 'Continuar',
        correct_option: '1',
        score: 0,
        is_correct: false,
      },
      {
        student_id: 's1',
        trail_id: 't1',
        student_answer: '1',
        correct_option: '',
        score: null,
        is_correct: false,
      },
      {
        student_id: 's1',
        trail_id: 't1',
        student_answer: '1',
        correct_option: '1',
        score: 1,
        is_correct: true,
      },
    ] as ExerciseAttempt[]
    const r = accuracyFromAttempts(attempts, 's1')
    expect(r.correct).toBe(1)
    expect(r.wrong).toBe(0)
  })
})

describe('doneActivities exportado via gestaoMetrics', () => {
  it('fixture 2×3: etapa 2 questão 1 → 3', () => {
    const cat = catalog2x3.get('t1')!
    expect(
      doneActivities(
        link({
          trail_id: 't1',
          status: 'in_progress',
          current_stage_number: 2,
          current_question_number: 1,
        }),
        cat,
      ),
    ).toBe(3)
  })
})
