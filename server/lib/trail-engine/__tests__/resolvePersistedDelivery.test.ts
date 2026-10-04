import { describe, expect, it } from 'vitest'

import { getNextContent } from '../getNextContent'
import {
  resolvePersistedDeliveryText,
  resolveStepDisplayBody,
} from '../resolvePersistedDelivery'
import { createMemoryFirestore } from './memoryFirestore'

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

describe('resolveStepDisplayBody', () => {
  it('prefere entrega persistida sobre curriculum', () => {
    expect(
      resolveStepDisplayBody({
        stage_type: 'ai',
        curriculum_content: '_template_cru_',
        persisted_delivery: 'Texto Gemini entregue no WA',
      }),
    ).toEqual({
      body: 'Texto Gemini entregue no WA',
      source: 'persisted_delivery',
    })
  })

  it('IA sem log não expõe template da grade', () => {
    expect(
      resolveStepDisplayBody({
        stage_type: 'ai',
        curriculum_content: '_PLACEHOLDER_',
        persisted_delivery: null,
      }),
    ).toEqual({ body: null, source: 'none' })
  })

  it('fixed usa curriculum quando não há log', () => {
    expect(
      resolveStepDisplayBody({
        stage_type: 'fixed',
        curriculum_content: 'Leitura fixa',
        persisted_delivery: null,
      }),
    ).toEqual({ body: 'Leitura fixa', source: 'curriculum' })
  })
})

describe('getNextContent + conversation_logs (paridade WA)', () => {
  it('mesma célula: log system substitui content Firestore', async () => {
    const mem = createMemoryFirestore()
    const student = 's10'
    const trail = 't1'
    mem.seed('student_trails', `${student}_trail_${trail}`, {
      student_id: student,
      institution_id: 'i1',
      trail_id: trail,
      current_stage_number: 2,
      current_question_number: 1,
      status: 'in_progress',
      progress_version: 3,
    })
    mem.seed('trail_stages', `${trail}_stage_2`, {
      trail_id: trail,
      stage_number: 2,
      stage_type: 'ai',
      prompt: 'Instrução interna Vertex',
      is_released: true,
    })
    mem.seed('trail_stage_questions', `${trail}_stage_2_q_1`, {
      trail_id: trail,
      stage_number: 2,
      question_number: 1,
      content: '_raw_template_nao_mostrar_',
      is_released: true,
    })
    mem.seed('conversation_logs', 'log_wa_1', {
      student_id: student,
      trail_id: trail,
      stage_number: 2,
      question_number: 1,
      sender: 'system',
      message_text: 'Resposta polida do Gemini para o aluno.',
      metadata: { kind: 'delivery', channel: 'whatsapp' },
      created_at_brasilia: '2026-09-21 14:00:00',
    })

    const direct = await resolvePersistedDeliveryText(
      mem.db,
      {
        student_id: student,
        trail_id: trail,
        stage_number: 2,
        question_number: 1,
      },
      COLLECTIONS,
    )
    expect(direct).toBe('Resposta polida do Gemini para o aluno.')

    const next = await getNextContent(
      mem.db,
      { student_id: student, trail_id: trail, channel: 'app' },
      COLLECTIONS,
    )
    expect(next.content).toBe('Resposta polida do Gemini para o aluno.')
    expect(next.content_source).toBe('persisted_delivery')
    expect(next.next_action).toBe('deliver_content')
  })

  it('GET repetido não altera progress_version (sem regenerar)', async () => {
    const mem = createMemoryFirestore()
    const student = 's10'
    const trail = 't1'
    mem.seed('student_trails', `${student}_trail_${trail}`, {
      student_id: student,
      institution_id: 'i1',
      trail_id: trail,
      current_stage_number: 1,
      current_question_number: 1,
      status: 'in_progress',
      progress_version: 5,
    })
    mem.seed('trail_stages', `${trail}_stage_1`, {
      trail_id: trail,
      stage_number: 1,
      stage_type: 'fixed',
      is_released: true,
    })
    mem.seed('trail_stage_questions', `${trail}_stage_1_q_1`, {
      trail_id: trail,
      stage_number: 1,
      question_number: 1,
      content: 'Texto fixo',
      is_released: true,
    })

    const a = await getNextContent(
      mem.db,
      { student_id: student, trail_id: trail },
      COLLECTIONS,
    )
    const b = await getNextContent(
      mem.db,
      { student_id: student, trail_id: trail },
      COLLECTIONS,
    )
    expect(a.content).toBe(b.content)
    expect(a.progress_version).toBe(5)
    expect(b.progress_version).toBe(5)
  })
})
