/**
 * Ciclo 3 — regressão de segurança (PASS = seguro).
 * Inverso das provas do Red Team em cycle3-red-team-bb92 / PR #49.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { isMutationMethod } from '../trail-engine/auth'
import { TrailEngineError } from '../trail-engine/errors'
import {
  getStudentSessionSecret,
  issueStudentSessionToken,
  resolveAuthPrincipal,
} from '../studentAuth'

const ROOT = join(__dirname, '../..')

const KNOWN = new Set([
  'home',
  'next-content',
  'status',
  'advance',
  'submit-exercise',
  'history',
  'conversation',
  'ensure-ai',
  'ensure-delivery',
])

function mutationRequiresServiceBearer(
  method: string,
  facade: string | null,
): boolean {
  const known = facade !== null && KNOWN.has(facade)
  return isMutationMethod(method) && !known
}

/** Espelho do gate seguro (allowlist) — inverso do gate vulnerável !facade. */
function secureMutationSkipsBearerOnlyForKnownFacade(
  method: string,
  facade: string | null,
): boolean {
  return isMutationMethod(method) && !(facade !== null && KNOWN.has(facade))
}

describe('RT-C1 regressão: allowlist facade', () => {
  it('facade inválido NÃO salta Bearer (legado ainda exige)', () => {
    expect(mutationRequiresServiceBearer('PUT', null)).toBe(true)
    expect(mutationRequiresServiceBearer('PUT', 'bogus')).toBe(true)
    expect(mutationRequiresServiceBearer('POST', 'not-a-facade')).toBe(true)
    expect(mutationRequiresServiceBearer('PUT', 'advance_stage')).toBe(true)
  })

  it('facade conhecida salta Bearer global (AuthZ via requireFacadeAuth)', () => {
    expect(mutationRequiresServiceBearer('POST', 'advance')).toBe(false)
    expect(mutationRequiresServiceBearer('GET', 'home')).toBe(false)
  })

  it('gate seguro: bogus ainda exige Bearer (inverso da prova RT-C1)', () => {
    expect(secureMutationSkipsBearerOnlyForKnownFacade('PUT', null)).toBe(true)
    expect(secureMutationSkipsBearerOnlyForKnownFacade('PUT', 'bogus')).toBe(
      true,
    )
    expect(
      secureMutationSkipsBearerOnlyForKnownFacade('POST', 'not-a-facade'),
    ).toBe(true)
    expect(
      secureMutationSkipsBearerOnlyForKnownFacade('PUT', 'advance_stage'),
    ).toBe(true)
    expect(secureMutationSkipsBearerOnlyForKnownFacade('POST', 'advance')).toBe(
      false,
    )
  })

  it('api/student_trails.ts usa KNOWN_FACADES / isKnownFacade', () => {
    const src = readFileSync(join(ROOT, '../api/student_trails.ts'), 'utf8')
    expect(src).toMatch(/KNOWN_FACADES/)
    expect(src).toMatch(/isKnownFacade/)
    expect(src).toMatch(/isMutationMethod\(request\.method\)\s*&&\s*!isKnownFacade/)
    expect(src).not.toMatch(
      /isMutationMethod\(request\.method\)\s*&&\s*!facade\b/,
    )
    expect(src).toMatch(/invalid_facade/)
  })
})

describe('RT-H1 regressão: GET legado com AuthZ', () => {
  it('GET legado chama requireFacadeAuth', () => {
    const src = readFileSync(join(ROOT, '../api/student_trails.ts'), 'utf8')
    const getLegacyIdx = src.indexOf(
      '// GET /student_trails/\n    // GET /student_trails?id=',
    )
    expect(getLegacyIdx).toBeGreaterThan(-1)
    const slice = src.slice(getLegacyIdx, getLegacyIdx + 3500)
    expect(slice).toContain('requireFacadeAuth')
  })
})

describe('RT-H2 regressão: satélites com Bearer', () => {
  it('exercise_attempts e conversation_logs exigem assertServiceBearer', () => {
    for (const file of [
      'api/exercise_attempts.ts',
      'api/conversation_logs.ts',
    ]) {
      const src = readFileSync(join(ROOT, `../${file}`), 'utf8')
      expect(src).toMatch(/assertServiceBearer/)
    }
  })

  it('GET /api/student exige Authorization Bearer', () => {
    const src = readFileSync(join(ROOT, '../api/student.ts'), 'utf8')
    expect(src).toContain('db.collection(collection).get()')
    expect(src).toMatch(/assertServiceBearer/)
  })
})

describe('RT-H3 regressão: sem leak student_id / enum inactive', () => {
  it('resolveStudentByPhone inactive NÃO ecoa student_id em details', () => {
    const src = readFileSync(
      join(ROOT, 'lib/trail-engine/resolveStudent.ts'),
      'utf8',
    )
    expect(src).toMatch(
      /TrailEngineError\(\s*['"]inactive_student['"],\s*['"][^'"]+['"],\s*\)/,
    )
    expect(src).not.toMatch(
      /TrailEngineError\(\s*['"]inactive_student['"],\s*[^,]+,\s*\{[\s\S]*?student_id/,
    )
    expect(src).toMatch(/Sem student_id|RT-H3/)
  })

  it('inactive_student e not_found partilham 404 (sem oráculo 409)', () => {
    const nf = new TrailEngineError('not_found', 'miss')
    const ina = new TrailEngineError('inactive_student', 'off')
    expect(nf.httpStatus).toBe(404)
    expect(ina.httpStatus).toBe(404)
    expect(ina.details?.student_id).toBeUndefined()
  })
})

describe('RT-C2/H4 regressão: firestore.rules fecham progresso e dumps', () => {
  it('student_trails / logs / attempts: write: if false', () => {
    const rules = readFileSync(join(ROOT, '../firestore.rules'), 'utf8')
    for (const [name, re] of [
      [
        'student_trails',
        /match \/student_trails\/\{studentTrailId\} \{[\s\S]*?\n    \}/,
      ],
      [
        'conversation_logs',
        /match \/conversation_logs\/\{logId\} \{[\s\S]*?\n    \}/,
      ],
      [
        'exercise_attempts',
        /match \/exercise_attempts\/\{attemptId\} \{[\s\S]*?\n    \}/,
      ],
    ] as const) {
      const block = rules.match(re)?.[0]
      expect(block, name).toBeTruthy()
      expect(block!).toMatch(/allow write: if false;/)
      expect(block!).not.toMatch(/allow read, write:/)
    }
    expect(rules).not.toMatch(
      /match \/students\/\{studentId\}[\s\S]{0,80}allow read, write: if true;/,
    )
  })
})

describe('RT-M2 regressão: canal aluno forçado a app', () => {
  it('resolveMutationChannel existe e force app para principal student', () => {
    const src = readFileSync(join(ROOT, '../api/student_trails.ts'), 'utf8')
    expect(src).toMatch(/function resolveMutationChannel/)
    expect(src).toMatch(
      /principal\.kind === ['"]student['"]\)\s*return ['"]app['"]/,
    )
    expect(src).toMatch(
      /facade === 'advance'[\s\S]*?resolveMutationChannel\(/,
    )
    expect(src).toMatch(
      /facade === 'submit-exercise'[\s\S]*?resolveMutationChannel\(/,
    )
  })

  it('sessão aluno → resolveAuthPrincipal kind student (binding canal no API)', () => {
    const env = { STUDENT_SESSION_SECRET: 'unit-test-secret-m2' }
    const { token } = issueStudentSessionToken(
      {
        student_id: 's1',
        institution_id: 'i1',
        name: 'A',
        phone_number: '5512974085258',
      },
      env,
    )
    const principal = resolveAuthPrincipal(`Bearer ${token}`, env)
    expect(principal.kind).toBe('student')
  })
})

describe('RT-M3 regressão: session secret fail-closed em prod', () => {
  it('produção sem STUDENT_SESSION_SECRET lança', () => {
    expect(() =>
      getStudentSessionSecret({
        NODE_ENV: 'production',
        VERCEL_ENV: 'production',
      }),
    ).toThrow(/STUDENT_SESSION_SECRET/)
  })

  it('dev sem secret ainda permite lab (não prod)', () => {
    const s = getStudentSessionSecret({ NODE_ENV: 'development' })
    expect(s.length).toBeGreaterThan(8)
    expect(s).toContain('LAB-ONLY')
  })

  it('com secret explícito emite token', () => {
    const env = { STUDENT_SESSION_SECRET: 'unit-test-secret' }
    const { token } = issueStudentSessionToken(
      {
        student_id: 's1',
        institution_id: 'i1',
        name: 'A',
        phone_number: '5512974085258',
      },
      env,
    )
    expect(token.startsWith('v1.')).toBe(true)
  })
})

describe('RT-H3/H4: login uniforme sem OTP documentado', () => {
  it('trilha_auth uniformiza miss/inactivo e documenta residual sem OTP', () => {
    const src = readFileSync(join(ROOT, '../api/trilha_auth.ts'), 'utf8')
    expect(src).toMatch(/loginDenied|Não foi possível entrar com este telefone/)
    expect(src).toMatch(/sem OTP|RT-H4|U1/)
    expect(src).toMatch(/inactive_student/)
    expect(src).toMatch(/not_found/)
  })
})

describe('RT-M4/M1 regressão: bounds + expected_version aluno', () => {
  it('advance legacy_update_position valida bounds', () => {
    const src = readFileSync(
      join(ROOT, 'lib/trail-engine/advance.ts'),
      'utf8',
    )
    expect(src).toMatch(/legacy_update_position[\s\S]*?loadTrailTotals/)
    expect(src).toMatch(/max_stage|maxStage/)
  })

  it('fachada exige expected_version para sessão aluno', () => {
    const src = readFileSync(join(ROOT, '../api/student_trails.ts'), 'utf8')
    expect(src).toMatch(/expected_version é obrigatório para sessão aluno/)
  })
})

describe('FE não confia facade da URL do browser', () => {
  it('trilhaApi só usa literais TRILHA_KNOWN_FACADES', () => {
    const src = readFileSync(
      join(ROOT, '../frontend/trilha-admin/src/lib/trilha/trilhaApi.ts'),
      'utf8',
    )
    expect(src).toMatch(/TRILHA_KNOWN_FACADES/)
    expect(src).toMatch(/facadeQuery\(/)
    expect(src).not.toMatch(/searchParams\.get\(\s*['"]facade['"]\s*\)/)
  })
})
