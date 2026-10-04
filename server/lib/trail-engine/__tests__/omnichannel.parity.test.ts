/**
 * Ciclo 2 — paridade omnichannel (I1 / I7 / I8).
 * Simula App ↔ WhatsApp (legacy_primitive) no mesmo student_trails.
 * Telefone de referência: 5512974085258 → sN de teste `s10`.
 */
import { beforeEach, describe, expect, it } from 'vitest'

import { advance } from '../advance'
import { getNextContent } from '../getNextContent'
import { getStatus } from '../getStatus'
import {
  authorizeStudentResource,
  issueStudentSessionToken,
  resolveAuthPrincipal,
} from '../../studentAuth'
import { advanceStudentTrailStage } from '../../studentTrailService'
import { createMemoryFirestore } from './memoryFirestore'

const PHONE = '5512974085258'
const STUDENT = 's10'
const OTHER = 's99'
const TRAIL = 't1'
const DOC = `${STUDENT}_trail_${TRAIL}`

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

function seedCurriculum(mem: ReturnType<typeof createMemoryFirestore>) {
  mem.seed('trails', TRAIL, {
    institution_id: 'i1',
    default_total_steps_per_stage: 8,
    title: 'Trilha Ciclo2',
  })
  // Conteúdo nas posições 2/1 e 3/1 (pós advance_stage a partir de 2/1)
  for (const stage of [2, 3]) {
    mem.seed('trail_stages', `${TRAIL}_stage_${stage}`, {
      trail_id: TRAIL,
      stage_number: stage,
      stage_type: 'fixed',
      title: `Etapa ${stage}`,
      is_released: true,
    })
    mem.seed(
      'trail_stage_questions',
      `${TRAIL}_stage_${stage}_q_1`,
      {
        trail_id: TRAIL,
        stage_number: stage,
        question_number: 1,
        content: `Conteúdo stage ${stage} q1`,
        is_released: true,
      },
    )
  }
  // Totals query: max question_number na trilha
  mem.seed('trail_stage_questions', `${TRAIL}_stage_1_q_10`, {
    trail_id: TRAIL,
    stage_number: 1,
    question_number: 10,
  })
}

function seedProgress(
  mem: ReturnType<typeof createMemoryFirestore>,
  patch: Record<string, unknown> = {},
) {
  mem.seed('student_trails', DOC, {
    student_id: STUDENT,
    institution_id: 'i1',
    trail_id: TRAIL,
    current_stage_number: 2,
    current_question_number: 1,
    status: 'in_progress',
    progress_version: 0,
    last_idempotency_key: null,
    last_channel: null,
    ...patch,
  })
}

describe('Ciclo 2 omnichannel parity', () => {
  let mem: ReturnType<typeof createMemoryFirestore>

  beforeEach(() => {
    mem = createMemoryFirestore()
    seedCurriculum(mem)
    seedProgress(mem)
  })

  it('C2-1: advance app → getStatus/next-content retomam o mesmo cursor (Chatis resume)', async () => {
    const key = `app:${STUDENT}:${TRAIL}:advance:2:1:evt-app-1`
    const adv = await advance(
      mem.db,
      {
        student_id: STUDENT,
        trail_id: TRAIL,
        idempotency_key: key,
        channel: 'app',
        reason: 'delivered',
        mark_delivered: true,
      },
      COLLECTIONS,
    )
    expect(adv.status).toBe('ok')
    expect(adv.next_stage_number).toBe(3)
    expect(adv.next_question_number).toBe(1)
    expect(adv.progress_version).toBe(1)
    expect(adv.channel).toBe('app')

    const status = await getStatus(mem.db, STUDENT, TRAIL, COLLECTIONS)
    expect(status.current_stage_number).toBe(3)
    expect(status.current_question_number).toBe(1)
    expect(status.progress_version).toBe(1)
    expect(status.last_channel).toBe('app')
    expect(status.last_idempotency_key).toBe(key)

    const next = await getNextContent(
      mem.db,
      { student_id: STUDENT, trail_id: TRAIL, channel: 'whatsapp' },
      COLLECTIONS,
    )
    expect(next.stage_number).toBe(3)
    expect(next.question_number).toBe(1)
    expect(next.progress_version).toBe(1)
    expect(next.content).toBe('Conteúdo stage 3 q1')
    expect(next.next_action).toBe('deliver_content')

    // Um único doc — sem fork de cursor (I1)
    const raw = mem.getData('student_trails', DOC)
    expect(raw?.current_stage_number).toBe(3)
    expect(raw?.progress_version).toBe(1)
  })

  it('C2-2: WA legacy_primitive (advance_stage) → app vê nova posição via status/next-content', async () => {
    const pos = await advanceStudentTrailStage(
      mem.db,
      'student_trails',
      STUDENT,
      TRAIL,
      { channel: 'whatsapp' },
    )
    expect(pos.current_stage_number).toBe(3)
    expect(pos.current_question_number).toBe(1)
    expect(pos.progress_version).toBe(1)

    const status = await getStatus(mem.db, STUDENT, TRAIL, COLLECTIONS)
    expect(status.current_stage_number).toBe(3)
    expect(status.last_channel).toBe('whatsapp')

    const next = await getNextContent(
      mem.db,
      { student_id: STUDENT, trail_id: TRAIL, channel: 'app' },
      COLLECTIONS,
    )
    expect(next.stage_number).toBe(3)
    expect(next.question_number).toBe(1)
    expect(next.content).toBe('Conteúdo stage 3 q1')
    expect(next.progress_version).toBe(1)
  })

  it('C2-3: double-click / Idempotency-Key duplicada → replay sem segundo +1', async () => {
    const key = `app:${STUDENT}:${TRAIL}:advance:2:1:double-tap`
    const first = await advance(
      mem.db,
      {
        student_id: STUDENT,
        trail_id: TRAIL,
        idempotency_key: key,
        channel: 'app',
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
        student_id: STUDENT,
        trail_id: TRAIL,
        idempotency_key: key,
        channel: 'app',
        reason: 'delivered',
      },
      COLLECTIONS,
    )
    expect(second.status).toBe('replay')
    expect(second.next_stage_number).toBe(3)
    expect(second.progress_version).toBe(1)

    const raw = mem.getData('student_trails', DOC)
    expect(raw?.current_stage_number).toBe(3)
    expect(raw?.progress_version).toBe(1)
  })

  it('C2-4: troca de canal sem perda de progresso (WA → app no mesmo doc)', async () => {
    const wa = await advance(
      mem.db,
      {
        student_id: STUDENT,
        trail_id: TRAIL,
        idempotency_key: `whatsapp:${STUDENT}:${TRAIL}:advance:2:1:wa1`,
        channel: 'whatsapp',
        reason: 'delivered',
      },
      COLLECTIONS,
    )
    expect(wa.next_stage_number).toBe(3)
    expect(wa.progress_version).toBe(1)

    const afterWa = await getStatus(mem.db, STUDENT, TRAIL, COLLECTIONS)
    expect(afterWa.last_channel).toBe('whatsapp')
    expect(afterWa.current_stage_number).toBe(3)

    const app = await advance(
      mem.db,
      {
        student_id: STUDENT,
        trail_id: TRAIL,
        idempotency_key: `app:${STUDENT}:${TRAIL}:advance:3:1:app1`,
        channel: 'app',
        reason: 'delivered',
        expected_version: 1,
      },
      COLLECTIONS,
    )
    expect(app.status).toBe('ok')
    expect(app.next_stage_number).toBe(4)
    expect(app.progress_version).toBe(2)
    expect(app.channel).toBe('app')

    // Seed conteúdo stage 4 para leitura pós-switch
    mem.seed('trail_stages', `${TRAIL}_stage_4`, {
      trail_id: TRAIL,
      stage_number: 4,
      stage_type: 'fixed',
      is_released: true,
    })
    mem.seed('trail_stage_questions', `${TRAIL}_stage_4_q_1`, {
      trail_id: TRAIL,
      stage_number: 4,
      question_number: 1,
      content: 'Pós switch canal',
      is_released: true,
    })

    const status = await getStatus(mem.db, STUDENT, TRAIL, COLLECTIONS)
    expect(status.current_stage_number).toBe(4)
    expect(status.progress_version).toBe(2)
    expect(status.last_channel).toBe('app')

    const next = await getNextContent(
      mem.db,
      { student_id: STUDENT, trail_id: TRAIL },
      COLLECTIONS,
    )
    expect(next.content).toBe('Pós switch canal')
    expect(next.progress_version).toBe(2)

    // Ainda um único documento
    expect(mem.getData('student_trails', DOC)?.student_id).toBe(STUDENT)
  })

  it('C2-5: AuthZ — aluno errado recebe 403; próprio sN ok; service ok', () => {
    const env = {
      STUDENT_SESSION_SECRET: 'ciclo2-omni-secret',
      TRAIL_ENGINE_SERVICE_TOKEN: 'service-ciclo2',
    }

    const { token: ownToken } = issueStudentSessionToken(
      {
        student_id: STUDENT,
        institution_id: 'i1',
        name: 'Aluno Teste',
        phone_number: PHONE,
      },
      env,
    )
    const own = resolveAuthPrincipal(`Bearer ${ownToken}`, env)
    expect(authorizeStudentResource(own, STUDENT)).toEqual({ ok: true })
    const denied = authorizeStudentResource(own, OTHER)
    expect(denied.ok).toBe(false)
    if (!denied.ok) {
      expect(denied.status).toBe(403)
      expect(denied.code).toBe('forbidden')
    }

    const service = resolveAuthPrincipal('Bearer service-ciclo2', env)
    expect(service.kind).toBe('service')
    expect(authorizeStudentResource(service, OTHER)).toEqual({ ok: true })

    const anon = resolveAuthPrincipal(null, env)
    const unauth = authorizeStudentResource(anon, STUDENT)
    expect(unauth.ok).toBe(false)
    if (!unauth.ok) expect(unauth.status).toBe(401)
  })

  it('C2-extra: expected_version stale após advance no outro canal → conflict (sem fork)', async () => {
    await advance(
      mem.db,
      {
        student_id: STUDENT,
        trail_id: TRAIL,
        idempotency_key: `whatsapp:${STUDENT}:${TRAIL}:advance:2:1:race`,
        channel: 'whatsapp',
        reason: 'delivered',
      },
      COLLECTIONS,
    )

    await expect(
      advance(
        mem.db,
        {
          student_id: STUDENT,
          trail_id: TRAIL,
          idempotency_key: `app:${STUDENT}:${TRAIL}:advance:2:1:stale`,
          channel: 'app',
          reason: 'delivered',
          expected_version: 0, // stale: WA já foi a v1
        },
        COLLECTIONS,
      ),
    ).rejects.toMatchObject({ code: 'conflict' })

    const status = await getStatus(mem.db, STUDENT, TRAIL, COLLECTIONS)
    expect(status.current_stage_number).toBe(3)
    expect(status.progress_version).toBe(1)
    expect(status.last_channel).toBe('whatsapp')
  })
})
