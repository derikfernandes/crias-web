/**
 * Testes de contrato: rotas públicas, rewrites e endpoints.
 * Não alteram produção — apenas verificam que os contratos permanecem estáveis.
 */
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const EXPECTED_API_FILES = [
  'institution.ts',
  'student.ts',
  'trails.ts',
  'trail_stages.ts',
  'trail_stage_questions.ts',
  'student_trails.ts',
  'conversation_logs.ts',
  'exercise_attempts.ts',
  'dashboard_summary.ts',
  'trilha_auth.ts',
]

/** Pares source → destination que sistemas externos e o admin dependem. */
const CRITICAL_REWRITES = [
  { source: '/institution', destination: '/api/institution' },
  { source: '/institution/simple', destination: '/api/institution?simple=1' },
  { source: '/student', destination: '/api/student' },
  { source: '/students', destination: '/api/student' },
  { source: '/trails', destination: '/api/trails' },
  { source: '/trail_stages', destination: '/api/trail_stages' },
  { source: '/trail_stage_questions', destination: '/api/trail_stage_questions' },
  { source: '/student_trails', destination: '/api/student_trails' },
  {
    source: '/student_trails/next-content',
    destination: '/api/student_trails?facade=next-content',
  },
  {
    source: '/student_trails/advance',
    destination: '/api/student_trails?facade=advance',
  },
  {
    source: '/student_trails/status',
    destination: '/api/student_trails?facade=status',
  },
  {
    source: '/student_trails/home',
    destination: '/api/student_trails?facade=home',
  },
  {
    source: '/student_trails/submit-exercise',
    destination: '/api/student_trails?facade=submit-exercise',
  },
  {
    source: '/student_trails/history',
    destination: '/api/student_trails?facade=history',
  },
  {
    source: '/trilha/auth',
    destination: '/api/trilha_auth',
  },
  {
    source: '/student/by-phone/:phone([0-9]+)',
    destination: '/api/student?phone_number=:phone',
  },
  { source: '/conversation_logs', destination: '/api/conversation_logs' },
]

test('arquivos de API serverless existem com os nomes do contrato', () => {
  for (const name of EXPECTED_API_FILES) {
    const path = join(root, 'api', name)
    assert.equal(existsSync(path), true, `faltando api/${name}`)
  }
})

test('vercel.json preserva rewrites críticos de API', () => {
  const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'))
  assert.ok(Array.isArray(vercel.rewrites), 'rewrites deve ser array')

  for (const expected of CRITICAL_REWRITES) {
    const hit = vercel.rewrites.find(
      (r) => r.source === expected.source && r.destination === expected.destination,
    )
    assert.ok(
      hit,
      `rewrite ausente ou alterado: ${expected.source} → ${expected.destination}`,
    )
  }
})

test('vercel.json continua apontando o build para frontend/trilha-admin/dist', () => {
  const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'))
  assert.equal(vercel.outputDirectory, 'frontend/trilha-admin/dist')
  assert.equal(vercel.buildCommand, 'npm run build')
})

test('handlers de API exportam default (contrato Vercel)', () => {
  for (const name of EXPECTED_API_FILES) {
    const src = readFileSync(join(root, 'api', name), 'utf8')
    assert.match(
      src,
      /export\s+default/,
      `api/${name} deve exportar default`,
    )
  }
})

test('frontend deleteTrailCascade mantém DELETE /api/trails?id=', () => {
  const src = readFileSync(
    join(root, 'frontend/trilha-admin/src/lib/trailApi.ts'),
    'utf8',
  )
  assert.match(src, /['"]\/api\/trails['"]/)
  assert.match(src, /method:\s*['"]DELETE['"]/)
  assert.match(src, /searchParams\.set\(\s*['"]id['"]/)
})

test('frontend deleteStudentCascade mantém DELETE /api/student?id=', () => {
  const src = readFileSync(
    join(root, 'frontend/trilha-admin/src/lib/studentApi.ts'),
    'utf8',
  )
  assert.match(src, /['"]\/api\/student['"]/)
  assert.match(src, /method:\s*['"]DELETE['"]/)
  assert.match(src, /searchParams\.set\(\s*['"]id['"]/)
})

test('api/student DELETE faz cascade em dependentes por student_id', () => {
  const src = readFileSync(join(root, 'api/student.ts'), 'utf8')
  assert.match(src, /deleteByStudentId/)
  assert.match(src, /student\.delete_cascade/)
  assert.match(src, /student_trails/)
  assert.match(src, /conversation_logs/)
  assert.match(src, /exercise_attempts/)
})

test('dashboardSummaryApi mantém GET /api/dashboard_summary', () => {
  const src = readFileSync(
    join(root, 'frontend/trilha-admin/src/lib/dashboardSummaryApi.ts'),
    'utf8',
  )
  assert.match(src, /\/api\/dashboard_summary/)
})

test('Shared Trail Engine Wave A existe no servidor', () => {
  const engineDir = join(root, 'server/lib/trail-engine')
  for (const name of [
    'index.ts',
    'advance.ts',
    'getNextContent.ts',
    'phoneNormalize.ts',
    'resolveStudent.ts',
    'enrollment.ts',
    'errors.ts',
    'auth.ts',
    'idempotencyKey.ts',
  ]) {
    assert.equal(
      existsSync(join(engineDir, name)),
      true,
      `faltando server/lib/trail-engine/${name}`,
    )
  }
  const studentTrailsApi = readFileSync(
    join(root, 'api/student_trails.ts'),
    'utf8',
  )
  assert.match(studentTrailsApi, /assertServiceBearer/)
  // Ciclo 3 RT-C1: allowlist de facades; legado exige Bearer quando !isKnownFacade
  assert.match(studentTrailsApi, /KNOWN_FACADES/)
  assert.match(studentTrailsApi, /isKnownFacade/)
  assert.match(
    studentTrailsApi,
    /isMutationMethod\(request\.method\)\s*&&\s*!isKnownFacade/,
  )
  assert.match(studentTrailsApi, /requireFacadeAuth/)
  assert.doesNotMatch(
    studentTrailsApi,
    /isMutationMethod\(request\.method\)\s*&&\s*!facade\b/,
  )
  assert.match(
    readFileSync(join(root, 'server/lib/studentTrailService.ts'), 'utf8'),
    /buildStableIdempotencyKey/,
  )
  assert.doesNotMatch(
    readFileSync(join(root, 'server/lib/studentTrailService.ts'), 'utf8'),
    /randomUUID/,
  )
})
