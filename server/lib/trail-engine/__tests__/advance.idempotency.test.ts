import { describe, expect, it } from 'vitest'

import {
  computeSemanticAdvance,
  resolveIdempotencyDecision,
} from '../advance'
import { contentFingerprint } from '../contentFingerprint'

describe('advance.idempotency', () => {
  it('replay com mesma key não implica segundo wrap', () => {
    const key = 'app:s1:t1:advance:8:1:evt-1'
    const before = {
      current_stage_number: 8,
      current_question_number: 1,
      total_stages: 8,
      total_questions: 10,
      status: 'in_progress' as const,
    }
    const computed = computeSemanticAdvance(before)
    const effect = [
      'delivered',
      computed.next_stage_number,
      computed.next_question_number,
      computed.completed ? '1' : '0',
      computed.status,
    ].join('|')

    expect(computed.next_stage_number).toBe(1)
    expect(computed.next_question_number).toBe(2)

    const decision = resolveIdempotencyDecision({
      last_key: key,
      incoming_key: key,
      stored_effect: effect,
      incoming_effect: effect,
    })
    expect(decision).toBe('replay')
    // Posição permanece a já persistida (simulada = pós-advance)
    expect(computed.next_stage_number).toBe(1)
  })

  it('mesma key com body incompatível → conflict', () => {
    expect(
      resolveIdempotencyDecision({
        last_key: 'k',
        incoming_key: 'k',
        stored_effect: 'delivered|||',
        incoming_effect: 'answered|||',
        satellite_hit: true,
      }),
    ).toBe('conflict')
  })

  it('fingerprint de conteúdo é estável para a mesma posição', () => {
    const a = contentFingerprint({
      trail_id: 't1',
      stage_number: 2,
      question_number: 1,
      stage_type: 'fixed',
      content: 'Olá',
    })
    const b = contentFingerprint({
      trail_id: 't1',
      stage_number: 2,
      question_number: 1,
      stage_type: 'fixed',
      content: 'Olá',
    })
    expect(a).toBe(b)
    expect(a).toContain('t1:2:1')
  })
})
