import { beforeEach, describe, expect, it } from 'vitest'

import { advance } from '../advance'
import { TrailEngineError } from '../errors'
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

describe('advance() com persistência (memory Firestore)', () => {
  let mem: ReturnType<typeof createMemoryFirestore>

  beforeEach(() => {
    mem = createMemoryFirestore()
    mem.seed('trails', 't1', {
      institution_id: 'i1',
      default_total_steps_per_stage: 8,
    })
    mem.seed('trail_stage_questions', 't1_stage_1_q_1', {
      trail_id: 't1',
      stage_number: 1,
      question_number: 1,
    })
    mem.seed('trail_stage_questions', 't1_stage_1_q_10', {
      trail_id: 't1',
      stage_number: 1,
      question_number: 10,
    })
    mem.seed('student_trails', 's1_trail_t1', {
      student_id: 's1',
      institution_id: 'i1',
      trail_id: 't1',
      current_stage_number: 2,
      current_question_number: 1,
      status: 'in_progress',
      progress_version: 0,
      last_idempotency_key: null,
      last_idempotency_effect: null,
    })
  })

  it('avança uma vez e replay da mesma key não faz +1', async () => {
    const key = 'whatsapp:s1:t1:advance:2:1:msg-1'
    const first = await advance(
      mem.db,
      {
        student_id: 's1',
        trail_id: 't1',
        idempotency_key: key,
        channel: 'whatsapp',
        reason: 'delivered',
      },
      COLLECTIONS,
    )
    expect(first.status).toBe('ok')
    expect(first.next_stage_number).toBe(3)
    expect(first.progress_version).toBe(1)

    const second = await advance(
      mem.db,
      {
        student_id: 's1',
        trail_id: 't1',
        idempotency_key: key,
        channel: 'whatsapp',
        reason: 'delivered',
      },
      COLLECTIONS,
    )
    expect(second.status).toBe('replay')
    expect(second.next_stage_number).toBe(3)
    expect(second.progress_version).toBe(1)

    const doc = mem.getData('student_trails', 's1_trail_t1')
    expect(doc?.current_stage_number).toBe(3)
    expect(doc?.progress_version).toBe(1)
  })

  it('expected_version stale → conflict 409', async () => {
    await advance(
      mem.db,
      {
        student_id: 's1',
        trail_id: 't1',
        idempotency_key: 'k-a',
        channel: 'app',
        reason: 'delivered',
      },
      COLLECTIONS,
    )

    await expect(
      advance(
        mem.db,
        {
          student_id: 's1',
          trail_id: 't1',
          idempotency_key: 'k-b',
          channel: 'app',
          reason: 'delivered',
          expected_version: 0,
        },
        COLLECTIONS,
      ),
    ).rejects.toMatchObject({
      code: 'conflict',
      httpStatus: 409,
    } satisfies Partial<TrailEngineError>)
  })

  it('legacy advance_stage +1 cego e key estável faz replay', async () => {
    const key = 'whatsapp:s1:t1:advance_stage:2:1:v0'
    const a = await advance(
      mem.db,
      {
        student_id: 's1',
        trail_id: 't1',
        idempotency_key: key,
        channel: 'whatsapp',
        reason: 'legacy_primitive',
        legacy_primitive: 'advance_stage',
      },
      COLLECTIONS,
    )
    expect(a.next_stage_number).toBe(3)
    expect(a.next_question_number).toBe(1)

    const b = await advance(
      mem.db,
      {
        student_id: 's1',
        trail_id: 't1',
        idempotency_key: key,
        channel: 'whatsapp',
        reason: 'legacy_primitive',
        legacy_primitive: 'advance_stage',
      },
      COLLECTIONS,
    )
    expect(b.status).toBe('replay')
    expect(mem.getData('student_trails', 's1_trail_t1')?.current_stage_number).toBe(
      3,
    )
  })

  it('mesma key com efeito incompatível (sem satélite, só last_effect) → conflict', async () => {
    // last_key bate mas last_idempotency_request ausente e last_effect legado
    // incomparável: storedForConflict usa last_idempotency_request ou last_effect;
    // com satellite_hit=false e last_key match + stored effect presente → replay.
    // Conflict real: satélite com request_fingerprint diferente.
    mem.seed('student_trails', 's1_trail_t1', {
      student_id: 's1',
      institution_id: 'i1',
      trail_id: 't1',
      current_stage_number: 3,
      current_question_number: 1,
      status: 'in_progress',
      progress_version: 1,
      last_idempotency_key: 'same-key',
      last_idempotency_request: 'delivered|||',
      last_idempotency_effect: 'delivered|3|1|0|in_progress',
    })
    mem.seed('idempotency_keys', 's1_t1_same-key', {
      request_fingerprint: 'answered|||',
      effect: 'answered|4|1|0|in_progress',
      response_snapshot: {
        next_stage_number: 4,
        next_question_number: 1,
        completed: false,
        progress_version: 1,
      },
    })

    await expect(
      advance(
        mem.db,
        {
          student_id: 's1',
          trail_id: 't1',
          idempotency_key: 'same-key',
          channel: 'app',
          reason: 'delivered',
        },
        COLLECTIONS,
      ),
    ).rejects.toMatchObject({ code: 'conflict' })
  })

  it('mesma key sem efeito armazenado → conflict (B3)', async () => {
    mem.seed('student_trails', 's1_trail_t1', {
      student_id: 's1',
      institution_id: 'i1',
      trail_id: 't1',
      current_stage_number: 2,
      current_question_number: 1,
      status: 'in_progress',
      progress_version: 1,
      last_idempotency_key: 'orphan-key',
      last_idempotency_effect: null,
      last_idempotency_request: null,
    })

    await expect(
      advance(
        mem.db,
        {
          student_id: 's1',
          trail_id: 't1',
          idempotency_key: 'orphan-key',
          channel: 'app',
          reason: 'delivered',
        },
        COLLECTIONS,
      ),
    ).rejects.toMatchObject({ code: 'conflict' })
  })
})
