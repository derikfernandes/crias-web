/**
 * Ciclo 3 Red Team — provas pós-fix (PASS = seguro / fix presente).
 *
 * Invertido face a PR #49 (onde PASS = bug). Criticals + High H1–H3 + Med M2–M4
 * fechados; H4/U1 e M5 (Wave C) + M1 residual service/WA documentados.
 *
 * Ver: internal/cycle3-red-team.md · internal/cycle3-red-team-reqa.md
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { beforeEach, describe, expect, it } from 'vitest'

import { advance } from '../advance'
import { isMutationMethod } from '../auth'
import { TrailEngineError } from '../errors'
import {
  authorizeStudentResource,
  getStudentSessionSecret,
  issueStudentSessionToken,
  resolveAuthPrincipal,
} from '../../studentAuth'
import { createMemoryFirestore } from './memoryFirestore'

const ROOT = join(__dirname, '../../../..')

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

const KNOWN_FACADES = new Set([
  'home',
  'next-content',
  'status',
  'advance',
  'submit-exercise',
  'history',
])

/** Espelho do gate CORRIGIDO (RT-C1): só facade conhecida salta Bearer global. */
function mutationRequiresServiceBearer(
  method: string,
  facade: string | null,
): boolean {
  const known = facade !== null && KNOWN_FACADES.has(facade)
  return isMutationMethod(method) && !known
}

describe('RT-C1 CRITICAL FIX: allowlist facade — bogus NÃO salta Bearer', () => {
  it('facade inválido / ausente em mutação ainda exige Bearer', () => {
    expect(mutationRequiresServiceBearer('PUT', null)).toBe(true)
    expect(mutationRequiresServiceBearer('POST', null)).toBe(true)
    expect(mutationRequiresServiceBearer('PUT', 'bogus')).toBe(true)
    expect(mutationRequiresServiceBearer('POST', 'not-a-facade')).toBe(true)
    expect(mutationRequiresServiceBearer('PUT', 'advance_stage')).toBe(true)
  })

  it('facade conhecida (advance) salta Bearer global (AuthZ via requireFacadeAuth)', () => {
    expect(mutationRequiresServiceBearer('POST', 'advance')).toBe(false)
    expect(mutationRequiresServiceBearer('GET', 'home')).toBe(false)
  })

  it('fonte: api/student_trails.ts usa KNOWN_FACADES / isKnownFacade (não !facade)', () => {
    const src = readFileSync(join(ROOT, 'api/student_trails.ts'), 'utf8')
    expect(src).toMatch(/KNOWN_FACADES/)
    expect(src).toMatch(/isKnownFacade/)
    expect(src).toMatch(
      /isMutationMethod\(request\.method\)\s*&&\s*!isKnownFacade/,
    )
    expect(src).not.toMatch(
      /isMutationMethod\(request\.method\)\s*&&\s*!facade\b/,
    )
    expect(src).toMatch(/invalid_facade/)
  })
})

describe('RT-C2 CRITICAL FIX: student_trails write negado no Client SDK', () => {
  it('firestore.rules: progresso allow write: if false (ADR-008)', () => {
    const rules = readFileSync(join(ROOT, 'firestore.rules'), 'utf8')
    const block = rules.match(
      /match \/student_trails\/\{studentTrailId\} \{[\s\S]*?\n    \}/,
    )?.[0]
    expect(block).toBeTruthy()
    expect(block!).toMatch(/allow write: if false;/)
    expect(block!).not.toMatch(/allow write: if signedIn\(\)/)
    expect(block!).not.toMatch(/allow read, write:/)
  })

  it('students/logs/attempts já não são allow write: if true (anon fechado)', () => {
    const rules = readFileSync(join(ROOT, 'firestore.rules'), 'utf8')
    for (const re of [
      /match \/students\/\{studentId\} \{[\s\S]*?\n    \}/,
      /match \/conversation_logs\/\{logId\} \{[\s\S]*?\n    \}/,
      /match \/exercise_attempts\/\{attemptId\} \{[\s\S]*?\n    \}/,
    ]) {
      const block = rules.match(re)?.[0]
      expect(block).toBeTruthy()
      expect(block!).not.toMatch(/if true/)
      expect(block!).toMatch(/signedIn\(\)/)
    }
  })
})

describe('RT-H1 HIGH FIX: GET legado student_trails com AuthZ', () => {
  it('GET posição/por-id chama requireFacadeAuth', () => {
    const src = readFileSync(join(ROOT, 'api/student_trails.ts'), 'utf8')
    const getLegacyIdx = src.indexOf(
      '// GET /student_trails/\n    // GET /student_trails?id=',
    )
    expect(getLegacyIdx).toBeGreaterThan(-1)
    const slice = src.slice(getLegacyIdx, getLegacyIdx + 3500)
    expect(slice).toContain('getStudentTrailByComposite')
    expect(slice).toContain('requireFacadeAuth')
  })
})

describe('RT-M2 MED FIX: canal aluno forçado a app', () => {
  it('resolveMutationChannel presente; advance usa channel resolvido', () => {
    const src = readFileSync(join(ROOT, 'api/student_trails.ts'), 'utf8')
    expect(src).toMatch(/function resolveMutationChannel/)
    expect(src).toMatch(
      /facade === 'advance'[\s\S]*?resolveMutationChannel\(request,\s*requestedChannel\)/,
    )
    expect(src).toMatch(/principal\.kind === 'student'\) return 'app'/)
  })
})

describe('RT-M3 MED FIX: session secret fail-closed em produção', () => {
  it('produção sem STUDENT_SESSION_SECRET lança', () => {
    expect(() =>
      getStudentSessionSecret({
        NODE_ENV: 'production',
        VERCEL_ENV: 'production',
      }),
    ).toThrow(/STUDENT_SESSION_SECRET/)
  })

  it('dev sem secret usa lab marcado (não o literal antigo sozinho)', () => {
    const secret = getStudentSessionSecret({ NODE_ENV: 'development' })
    expect(secret).toContain('LAB-ONLY')
    expect(secret).not.toBe('crias-dev-student-session-secret')
  })

  it('com secret conhecido, forja token e AuthZ no próprio sN (esperado)', () => {
    const env = {
      STUDENT_SESSION_SECRET: 'red-team-known-secret',
    } as NodeJS.ProcessEnv
    const { token } = issueStudentSessionToken(
      {
        student_id: 'sVictim',
        institution_id: 'i1',
        name: 'Forged',
        phone_number: '5511999999999',
      },
      env,
    )
    const principal = resolveAuthPrincipal(`Bearer ${token}`, env)
    expect(principal.kind).toBe('student')
    expect(authorizeStudentResource(principal, 'sVictim')).toEqual({ ok: true })
    expect(authorizeStudentResource(principal, 'sOther').ok).toBe(false)
  })
})

describe('RT-H3 PARTIAL FIX: login trilha_auth uniforme (sem oráculo 404/409)', () => {
  it('trilha_auth uniformiza miss/inactivo → 401 genérico', () => {
    const src = readFileSync(join(ROOT, 'api/trilha_auth.ts'), 'utf8')
    expect(src).toMatch(/loginDenied|Não foi possível entrar com este telefone/)
    expect(src).toMatch(/inactive_student/)
    expect(src).toMatch(/not_found/)
  })
})

/* -------------------------------------------------------------------------- */
/* FIX High/Med — PASS = seguro                                               */
/* -------------------------------------------------------------------------- */

describe('RT-H2 HIGH FIX: APIs satélite com Bearer', () => {
  it('exercise_attempts e conversation_logs exigem assertServiceBearer', () => {
    for (const file of [
      'api/exercise_attempts.ts',
      'api/conversation_logs.ts',
    ]) {
      const src = readFileSync(join(ROOT, file), 'utf8')
      expect(src).toMatch(/assertServiceBearer/)
    }
  })

  it('GET /api/student exige Authorization Bearer', () => {
    const src = readFileSync(join(ROOT, 'api/student.ts'), 'utf8')
    expect(src).toContain('db.collection(collection).get()')
    expect(src).toMatch(/assertServiceBearer/)
  })
})

describe('RT-H3 HIGH FIX: resolveStudent sem leak student_id / enum 409', () => {
  it('inactive_student NÃO inclui student_id em details', () => {
    const src = readFileSync(
      join(ROOT, 'server/lib/trail-engine/resolveStudent.ts'),
      'utf8',
    )
    // Throw inactive: só code + message (sem 3º arg details).
    expect(src).toMatch(
      /TrailEngineError\(\s*['"]inactive_student['"],\s*['"][^'"]+['"],\s*\)/,
    )
    expect(src).not.toMatch(
      /TrailEngineError\(\s*['"]inactive_student['"],\s*[^,]+,\s*\{[\s\S]*?student_id/,
    )
  })

  it('not_found e inactive partilham 404 (sem oráculo 409)', () => {
    const nf = new TrailEngineError('not_found', 'miss')
    const ina = new TrailEngineError('inactive_student', 'off')
    expect(nf.httpStatus).toBe(404)
    expect(ina.httpStatus).toBe(404)
    expect(ina.details?.student_id).toBeUndefined()
  })
})

describe('RT-C2 satellite FIX: logs/attempts write: if false', () => {
  it('conversation_logs / exercise_attempts negam write no Client SDK', () => {
    const rules = readFileSync(join(ROOT, 'firestore.rules'), 'utf8')
    for (const re of [
      /match \/conversation_logs\/\{logId\} \{[\s\S]*?\n    \}/,
      /match \/exercise_attempts\/\{attemptId\} \{[\s\S]*?\n    \}/,
    ]) {
      const block = rules.match(re)?.[0]
      expect(block).toBeTruthy()
      expect(block!).toMatch(/allow write: if false;/)
      expect(block!).not.toMatch(/allow read, write: if signedIn\(\);/)
    }
  })
})

describe('RT-M4 MED FIX: update_position com bounds vs totais', () => {
  it('motor valida max_stage / max_question em legacy_update_position', () => {
    const src = readFileSync(
      join(ROOT, 'server/lib/trail-engine/advance.ts'),
      'utf8',
    )
    expect(src).toMatch(
      /legacy_update_position[\s\S]*?loadTrailTotals[\s\S]*?(max_stage|maxStage)/,
    )
  })

  it('API update_position documenta bounds no motor', () => {
    const src = readFileSync(join(ROOT, 'api/student_trails.ts'), 'utf8')
    const idx = src.indexOf("if (action === 'update_position')")
    expect(idx).toBeGreaterThan(-1)
    const slice = src.slice(idx, idx + 1600)
    expect(slice).toMatch(/parsedStage|current_stage_number/)
    expect(slice).toMatch(/bounds|max_stage|loadTrailTotals/)
  })

  it('advance rejeita stage/question acima do teto da trilha', async () => {
    const mem = createMemoryFirestore()
    mem.seed('trails', 't1', {
      institution_id: 'i1',
      default_total_steps_per_stage: 8,
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
    })
    await expect(
      advance(
        mem.db,
        {
          student_id: 's1',
          trail_id: 't1',
          idempotency_key: 'admin:s1:t1:update_position:overflow',
          channel: 'admin',
          reason: 'legacy_update_position',
          set_stage: 999999,
          set_question: 999999,
        },
        COLLECTIONS,
      ),
    ).rejects.toMatchObject({ code: 'invalid_payload' })
  })
})

describe('RT-M1 MED FIX parcial: sessão aluno exige expected_version', () => {
  it('fachada advance/submit exige expected_version para principal student', () => {
    const src = readFileSync(join(ROOT, 'api/student_trails.ts'), 'utf8')
    expect(src).toMatch(
      /principal\.kind === ['"]student['"][\s\S]{0,120}expected_version|expectedVersion === undefined/,
    )
    expect(src).toMatch(
      /expected_version é obrigatório para sessão aluno/,
    )
  })

  it('expected_version no 2º pedido bloqueia o double-tap (mitigação FE/API)', async () => {
    const mem = createMemoryFirestore()
    mem.seed('trails', 't1', {
      institution_id: 'i1',
      default_total_steps_per_stage: 8,
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
    })
    await advance(
      mem.db,
      {
        student_id: 's1',
        trail_id: 't1',
        idempotency_key: 'app:s1:t1:advance:2:1:uuid-A',
        channel: 'app',
        reason: 'delivered',
        expected_version: 0,
      },
      COLLECTIONS,
    )
    await expect(
      advance(
        mem.db,
        {
          student_id: 's1',
          trail_id: 't1',
          idempotency_key: 'app:s1:t1:advance:2:1:uuid-B',
          channel: 'app',
          reason: 'delivered',
          expected_version: 0,
        },
        COLLECTIONS,
      ),
    ).rejects.toMatchObject({ code: 'conflict' })
  })
})

/* -------------------------------------------------------------------------- */
/* RESIDUAL OPEN — dívida conhecida (PASS = residual documentado)             */
/* -------------------------------------------------------------------------- */

describe('RESIDUAL OPEN RT-H4 U1: login telefone sem OTP', () => {
  it('trilha_auth documenta ausência de OTP (risco aceite v1)', () => {
    const src = readFileSync(join(ROOT, 'api/trilha_auth.ts'), 'utf8')
    expect(src).toMatch(/sem OTP|RT-H4|U1/)
  })
})

describe('RESIDUAL OPEN RT-M1 service: sem expected_version ainda double-advance', () => {
  it('motor sem expected_version (path service/WA) ainda permite 2 keys → +2', async () => {
    const mem = createMemoryFirestore()
    mem.seed('trails', 't1', {
      institution_id: 'i1',
      default_total_steps_per_stage: 8,
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
    })
    const a = await advance(
      mem.db,
      {
        student_id: 's1',
        trail_id: 't1',
        idempotency_key: 'wa:s1:t1:advance:2:1:uuid-A',
        channel: 'whatsapp',
        reason: 'delivered',
      },
      COLLECTIONS,
    )
    const b = await advance(
      mem.db,
      {
        student_id: 's1',
        trail_id: 't1',
        idempotency_key: 'wa:s1:t1:advance:2:1:uuid-B',
        channel: 'whatsapp',
        reason: 'delivered',
      },
      COLLECTIONS,
    )
    expect(a.status).toBe('ok')
    expect(b.status).toBe('ok')
    expect(mem.getData('student_trails', 's1_trail_t1')?.progress_version).toBe(
      2,
    )
  })
})

describe('CLOSED RT-M5 / L1: parser Chatis / IR presente (I5 / Wave C)', () => {
  it('server/lib/chatis-flow expõe parseChatisExport + validate:chatis-flow', () => {
    const pkg = readFileSync(join(ROOT, 'package.json'), 'utf8')
    expect(pkg).toMatch(/validate:chatis-flow/)
    const parser = readFileSync(
      join(ROOT, 'server/lib/chatis-flow/parseChatisExport.ts'),
      'utf8',
    )
    expect(parser).toMatch(/export function parseChatisExport/)
    const index = readFileSync(
      join(ROOT, 'server/lib/chatis-flow/index.ts'),
      'utf8',
    )
    expect(index).toMatch(/parseChatisExport/)
    expect(index).toMatch(/migrateFlow24To25/)
    expect(index).toMatch(/decideStudentMigration/)
  })
})
