import { describe, expect, it } from 'vitest'
import {
  engagementFromLinks,
  accuracyFromAttempts,
} from './dashboardTrailProgress'
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

describe('engagementFromLinks', () => {
  it('trata 100% de atividades como Concluiu mesmo com status in_progress', () => {
    const totals = new Map([['t1', 3]])
    const status = engagementFromLinks(
      [link({ trail_id: 't1', status: 'in_progress', current_question_number: 4 })],
      totals,
    )
    expect(status).toBe('completed')
  })

  it('status completed explícito', () => {
    expect(
      engagementFromLinks([link({ trail_id: 't1', status: 'completed' })]),
    ).toBe('completed')
  })
})

describe('accuracyFromAttempts', () => {
  it('conta por student_id mesmo sem filtrar trilha vazia', () => {
    const attempts = [
      {
        student_id: 's1',
        trail_id: 't1',
        is_correct: true,
      },
      {
        student_id: 's1',
        trail_id: 't1',
        is_correct: false,
      },
    ] as ExerciseAttempt[]
    const r = accuracyFromAttempts(attempts, 's1', new Set(['t1']))
    expect(r.correct).toBe(1)
    expect(r.wrong).toBe(1)
  })
})
