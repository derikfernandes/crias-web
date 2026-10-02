import { describe, expect, it } from 'vitest'

import {
  listRecentContextLogs,
  resolveDeliveredAiContent,
} from '../resolveDeliveredAiContent'
import { createMemoryFirestore } from '../../trail-engine/__tests__/memoryFirestore'

const COLLECTIONS = {
  students: 'students',
  trails: 'trails',
  studentTrails: 'student_trails',
  trailStages: 'trail_stages',
  trailStageQuestions: 'trail_stage_questions',
  conversationLogs: 'conversation_logs',
  exerciseAttempts: 'exercise_attempts',
  idempotencyKeys: 'idempotency_keys',
}

describe('resolveDeliveredAiContent (sem índice composto)', () => {
  it('filtra stage/question/sender em memória e pega o mais recente', async () => {
    const mem = createMemoryFirestore()
    const student = 's1'
    const trail = 't1'

    mem.seed('conversation_logs', 'old', {
      student_id: student,
      trail_id: trail,
      stage_number: 2,
      question_number: 1,
      sender: 'system',
      message_text: 'entrega antiga',
      created_at_brasilia: '2026-09-20 10:00:00',
    })
    mem.seed('conversation_logs', 'noise_stage', {
      student_id: student,
      trail_id: trail,
      stage_number: 1,
      question_number: 1,
      sender: 'system',
      message_text: 'outra etapa',
      created_at_brasilia: '2026-09-22 12:00:00',
    })
    mem.seed('conversation_logs', 'noise_student', {
      student_id: student,
      trail_id: trail,
      stage_number: 2,
      question_number: 1,
      sender: 'student',
      message_text: 'resposta do aluno',
      created_at_brasilia: '2026-09-22 13:00:00',
    })
    mem.seed('conversation_logs', 'fresh', {
      student_id: student,
      trail_id: trail,
      stage_number: 2,
      question_number: 1,
      sender: 'system',
      message_text: 'entrega nova',
      created_at_brasilia: '2026-09-21 18:00:00',
    })

    const hit = await resolveDeliveredAiContent(
      mem.db,
      {
        student_id: student,
        trail_id: trail,
        stage_number: 2,
        question_number: 1,
      },
      COLLECTIONS,
    )
    expect(hit).toEqual({
      message_text: 'entrega nova',
      log_id: 'fresh',
    })
  })

  it('listRecentContextLogs ordena em memória e limita', async () => {
    const mem = createMemoryFirestore()
    mem.seed('conversation_logs', 'a', {
      student_id: 's1',
      trail_id: 't1',
      sender: 'system',
      message_text: 'primeira',
      stage_number: 1,
      question_number: 1,
      created_at_brasilia: '2026-09-21 10:00:00',
    })
    mem.seed('conversation_logs', 'b', {
      student_id: 's1',
      trail_id: 't1',
      sender: 'student',
      message_text: 'segunda',
      stage_number: 1,
      question_number: 1,
      created_at_brasilia: '2026-09-21 11:00:00',
    })
    mem.seed('conversation_logs', 'c', {
      student_id: 's1',
      trail_id: 't1',
      sender: 'system',
      message_text: 'terceira',
      stage_number: 1,
      question_number: 2,
      created_at_brasilia: '2026-09-21 12:00:00',
    })

    const rows = await listRecentContextLogs(
      mem.db,
      { student_id: 's1', trail_id: 't1', limit: 2 },
      COLLECTIONS,
    )
    expect(rows).toHaveLength(2)
    expect(rows[0]?.message_text).toBe('segunda')
    expect(rows[1]?.message_text).toBe('terceira')
  })
})
