import { describe, expect, it } from 'vitest'

import { createMemoryFirestore } from './memoryFirestore'
import { getTrailConversation } from '../getConversation'
import { ensureStepDelivery } from '../ensureStepDelivery'

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

describe('getTrailConversation + ensureStepDelivery', () => {
  it('lista logs em ordem cronológica', async () => {
    const mem = createMemoryFirestore()
    mem.seed('student_trails', 's1_trail_t1', {
      student_id: 's1',
      trail_id: 't1',
      institution_id: 'i1',
      current_stage_number: 1,
      current_question_number: 2,
      status: 'in_progress',
      progress_version: 1,
    })
    mem.seed('conversation_logs', 'a', {
      student_id: 's1',
      trail_id: 't1',
      stage_number: 1,
      question_number: 1,
      sender: 'system',
      message_text: 'Primeira',
      created_at_brasilia: '2026-09-23T10:00:00',
    })
    mem.seed('conversation_logs', 'b', {
      student_id: 's1',
      trail_id: 't1',
      stage_number: 1,
      question_number: 2,
      sender: 'student',
      message_text: 'B',
      created_at_brasilia: '2026-09-23T10:01:00',
    })

    const result = await getTrailConversation(
      mem.db,
      { student_id: 's1', trail_id: 't1' },
      COLLECTIONS,
    )
    expect(result.messages.map((m) => m.message_text)).toEqual([
      'Primeira',
      'B',
    ])
  })

  it('ensureStepDelivery grava curriculum fixed uma vez', async () => {
    const mem = createMemoryFirestore()
    mem.seed('student_trails', 's1_trail_t1', {
      student_id: 's1',
      trail_id: 't1',
      institution_id: 'i1',
      current_stage_number: 1,
      current_question_number: 1,
      status: 'in_progress',
      progress_version: 0,
    })
    mem.seed('trail_stages', 't1_stage_1', {
      trail_id: 't1',
      stage_number: 1,
      stage_type: 'fixed',
      is_released: true,
    })
    mem.seed('trail_stage_questions', 't1_stage_1_q_1', {
      trail_id: 't1',
      stage_number: 1,
      question_number: 1,
      content: 'Leia isto com atenção.',
      active: true,
    })

    const first = await ensureStepDelivery(
      mem.db,
      { student_id: 's1', trail_id: 't1', channel: 'app' },
      COLLECTIONS,
    )
    expect(first.persisted).toBe(true)
    expect(first.content).toContain('Leia isto')

    const second = await ensureStepDelivery(
      mem.db,
      { student_id: 's1', trail_id: 't1', channel: 'app' },
      COLLECTIONS,
    )
    expect(second.persisted).toBe(false)
    expect(second.already_had_delivery).toBe(true)

    const conversation = await getTrailConversation(
      mem.db,
      { student_id: 's1', trail_id: 't1' },
      COLLECTIONS,
    )
    expect(conversation.messages).toHaveLength(1)
  })
})
