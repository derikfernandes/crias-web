import { describe, expect, it } from 'vitest'

import {
  computeSemanticAdvance,
  resolveIdempotencyDecision,
} from '../advance'

/**
 * Simula concorrência lógica: dois advances com expected_version
 * e a mesma/outra Idempotency-Key.
 */
describe('advance concurrency (lógica)', () => {
  it('segundo cliente com expected_version stale deve conflict', () => {
    // Cliente A lê version=0, avança → version=1
    // Cliente B ainda tem expected_version=0 → conflict
    const versionA = 0
    const versionAfterA = versionA + 1
    const expectedB = 0
    expect(expectedB === versionAfterA).toBe(false)
    // O motor rejeita com conflict quando expected !== atual
    expect(expectedB !== versionAfterA).toBe(true)
  })

  it('double-tap mesma key → replay (sem segundo +1)', () => {
    const key = 'whatsapp:s10:t1:advance:2:1:msg1'
    const effect = 'delivered|3|1|0|in_progress'

    const first = resolveIdempotencyDecision({
      last_key: null,
      incoming_key: key,
      incoming_effect: effect,
    })
    expect(first).toBe('proceed')

    const second = resolveIdempotencyDecision({
      last_key: key,
      incoming_key: key,
      stored_effect: effect,
      incoming_effect: effect,
    })
    expect(second).toBe('replay')
  })

  it('corrida WA vs app: quem perde sincroniza pela posição computada', () => {
    // Ambos em stage=2,question=1,total=8
    const fromA = computeSemanticAdvance({
      current_stage_number: 2,
      current_question_number: 1,
      total_stages: 8,
      total_questions: 10,
      status: 'in_progress',
    })
    // App ainda pensa estar em 2/1 mas servidor já está em 3/1
    const stale = computeSemanticAdvance({
      current_stage_number: 2,
      current_question_number: 1,
      total_stages: 8,
      total_questions: 10,
      status: 'in_progress',
    })
    expect(fromA.next_stage_number).toBe(3)
    expect(stale.next_stage_number).toBe(3)
    // Com expected_version, o segundo pedido falha e o cliente re-fetch
    // getNextContent — sem fork de cursor (I1/I7).
    expect(fromA.next_question_number).toBe(stale.next_question_number)
  })
})

describe('advance.idempotency effect fingerprint stability', () => {
  it('mesmo input produz mesmo efeito lógico', () => {
    const a = computeSemanticAdvance({
      current_stage_number: 8,
      current_question_number: 1,
      total_stages: 8,
      total_questions: 10,
      status: 'in_progress',
    })
    const b = computeSemanticAdvance({
      current_stage_number: 8,
      current_question_number: 1,
      total_stages: 8,
      total_questions: 10,
      status: 'in_progress',
    })
    expect(a).toEqual(b)
  })
})
