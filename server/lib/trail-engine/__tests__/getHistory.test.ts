import { describe, expect, it } from 'vitest'

import { getTrailHistory } from '../getHistory'
import { createMemoryFirestore } from './memoryFirestore'

const COLLECTIONS = {
  students: 'students',
  trails: 'trails',
  trailStages: 'trail_stages',
  trailStageQuestions: 'trail_stage_questions',
  studentTrails: 'student_trails',
  conversationLogs: 'conversation_logs',
  exerciseAttempts: 'exercise_attempts',
  idempotencyKeys: 'idempotency_keys',
}

describe('getTrailHistory', () => {
  it('lista só passos antes do cursor com tentativa de exercício', async () => {
    const mem = createMemoryFirestore()

    mem.seed('student_trails', 's1_trail_t1', {
      student_id: 's1',
      trail_id: 't1',
      institution_id: 'i1',
      current_stage_number: 2,
      current_question_number: 1,
      status: 'in_progress',
      progress_version: 3,
      last_channel: 'app',
    })

    mem.seed('trail_stages', 't1_stage_1', {
      trail_id: 't1',
      stage_number: 1,
      stage_type: 'fixed',
      title: 'Intro',
      is_released: true,
    })
    mem.seed('trail_stages', 't1_stage_2', {
      trail_id: 't1',
      stage_number: 2,
      stage_type: 'exercise',
      title: 'Ex',
      is_released: true,
    })

    mem.seed('trail_stage_questions', 't1_stage_1_q_1', {
      trail_id: 't1',
      stage_number: 1,
      question_number: 1,
      title: 'Etapa 1',
      content: 'Conteúdo *etapa 1*',
      options: null,
      active: true,
      is_released: true,
    })
    mem.seed('trail_stage_questions', 't1_stage_2_q_1', {
      trail_id: 't1',
      stage_number: 2,
      question_number: 1,
      title: 'Atual',
      content: 'Ainda não',
      options: null,
      active: true,
      is_released: true,
    })

    mem.seed('exercise_attempts', 'a1', {
      student_id: 's1',
      trail_id: 't1',
      stage_number: 1,
      question_number: 1,
      student_answer: 'ok',
      is_correct: true,
      attempt_number: 1,
      attempted_at: '2026-09-21T00:00:00.000Z',
    })

    const history = await getTrailHistory(
      mem.db,
      { student_id: 's1', trail_id: 't1' },
      COLLECTIONS,
    )

    expect(history.items).toHaveLength(1)
    expect(history.items[0]?.stage_number).toBe(1)
    expect(history.items[0]?.content).toContain('etapa 1')
    expect(history.items[0]?.student_answer).toBe('ok')
    expect(history.items[0]?.is_correct).toBe(true)
  })
})
