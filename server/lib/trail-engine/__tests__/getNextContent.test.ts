import { describe, expect, it } from 'vitest'

import {
  computeLegacyPrimitiveAdvance,
  computeSemanticAdvance,
  resolveIdempotencyDecision,
} from '../advance'
import { decideNextAction } from '../getNextContent'

describe('computeSemanticAdvance (specs/tests.yaml)', () => {
  it('avança stage dentro da etapa', () => {
    const r = computeSemanticAdvance({
      current_stage_number: 3,
      current_question_number: 1,
      total_stages: 8,
      total_questions: 10,
      status: 'in_progress',
    })
    expect(r).toEqual({
      next_stage_number: 4,
      next_question_number: 1,
      completed: false,
      status: 'in_progress',
    })
  })

  it('reinicia stage e avança questão ao final da etapa', () => {
    const r = computeSemanticAdvance({
      current_stage_number: 8,
      current_question_number: 1,
      total_stages: 8,
      total_questions: 10,
      status: 'in_progress',
    })
    expect(r).toEqual({
      next_stage_number: 1,
      next_question_number: 2,
      completed: false,
      status: 'in_progress',
    })
  })

  it('marca concluído na última questão/stage', () => {
    const r = computeSemanticAdvance({
      current_stage_number: 8,
      current_question_number: 10,
      total_stages: 8,
      total_questions: 10,
      status: 'in_progress',
    })
    expect(r.completed).toBe(true)
    expect(r.status).toBe('completed')
  })
})

describe('computeLegacyPrimitiveAdvance (Chatis 2.4)', () => {
  it('advance_stage incrementa só o stage', () => {
    const r = computeLegacyPrimitiveAdvance({
      current_stage_number: 2,
      current_question_number: 3,
      status: 'in_progress',
      primitive: 'advance_stage',
    })
    expect(r.next_stage_number).toBe(3)
    expect(r.next_question_number).toBe(3)
    expect(r.completed).toBe(false)
  })

  it('advance_question incrementa só a questão', () => {
    const r = computeLegacyPrimitiveAdvance({
      current_stage_number: 2,
      current_question_number: 3,
      status: 'in_progress',
      primitive: 'advance_question',
    })
    expect(r.next_stage_number).toBe(2)
    expect(r.next_question_number).toBe(4)
  })

  it('não avança se completed/blocked', () => {
    const blocked = computeLegacyPrimitiveAdvance({
      current_stage_number: 1,
      current_question_number: 1,
      status: 'blocked',
      primitive: 'advance_stage',
    })
    expect(blocked.status).toBe('blocked')
    expect(blocked.next_stage_number).toBe(1)
  })
})

describe('resolveIdempotencyDecision', () => {
  it('proceed quando key nova', () => {
    expect(
      resolveIdempotencyDecision({
        last_key: null,
        incoming_key: 'app:s1:t1:advance:1:1:a',
        incoming_effect: 'delivered|2|1|0|in_progress',
      }),
    ).toBe('proceed')
  })

  it('conflict quando mesma key e request fingerprint diferente', () => {
    expect(
      resolveIdempotencyDecision({
        last_key: 'k1',
        incoming_key: 'k1',
        stored_effect: 'delivered|||',
        incoming_effect: 'answered|||',
        satellite_hit: true,
      }),
    ).toBe('conflict')
  })

  it('replay via satélite com mesmo request fingerprint', () => {
    expect(
      resolveIdempotencyDecision({
        last_key: 'k1',
        incoming_key: 'k1',
        stored_effect: 'delivered|||',
        incoming_effect: 'delivered|||',
        satellite_hit: true,
      }),
    ).toBe('replay')
  })

  it('conflict quando mesma key sem efeito armazenado (B3)', () => {
    expect(
      resolveIdempotencyDecision({
        last_key: 'k1',
        incoming_key: 'k1',
        stored_effect: null,
        incoming_effect: 'delivered|||',
      }),
    ).toBe('conflict')
  })

  it('replay quando last_key bate e há efeito (não recompute)', () => {
    expect(
      resolveIdempotencyDecision({
        last_key: 'k1',
        incoming_key: 'k1',
        stored_effect: 'delivered|||',
        incoming_effect: 'other',
      }),
    ).toBe('replay')
  })
})

describe('decideNextAction / getNextContent', () => {
  it('deliver_content para fixed released', () => {
    expect(
      decideNextAction({
        status: 'in_progress',
        stageExists: true,
        questionExists: true,
        is_released: true,
        stage_type: 'fixed',
      }),
    ).toBe('deliver_content')
  })

  it('await_answer para exercise released', () => {
    expect(
      decideNextAction({
        status: 'in_progress',
        stageExists: true,
        questionExists: true,
        is_released: true,
        stage_type: 'exercise',
      }),
    ).toBe('await_answer')
  })

  it('await_release quando não liberado', () => {
    expect(
      decideNextAction({
        status: 'in_progress',
        stageExists: true,
        questionExists: true,
        is_released: false,
        stage_type: 'fixed',
      }),
    ).toBe('await_release')
  })

  it('completed / blocked pelo status', () => {
    expect(
      decideNextAction({
        status: 'completed',
        stageExists: true,
        questionExists: true,
        is_released: true,
        stage_type: 'fixed',
      }),
    ).toBe('completed')
    expect(
      decideNextAction({
        status: 'blocked',
        stageExists: true,
        questionExists: true,
        is_released: true,
        stage_type: 'fixed',
      }),
    ).toBe('blocked')
  })
})
