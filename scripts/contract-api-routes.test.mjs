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
    destination: '/api/student_trails?action=next-content',
  },
  {
    source: '/student_trails/advance',
    destination: '/api/student_trails?action=advance',
  },
  {
    source: '/student/identify',
    destination: '/api/student?action=identify',
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

test('vercel.json serve SPA do aluno em /aluno sem roubar /api', () => {
  const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'))
  const sources = vercel.rewrites.map((r) => r.source)

  assert.ok(sources.includes('/aluno'))
  assert.ok(sources.includes('/aluno/'))
  assert.ok(
    sources.includes('/aluno/((?!assets/).*)'),
    'rewrite do aluno deve excluir /aluno/assets/*',
  )

  const catchAll = vercel.rewrites.find((r) =>
    String(r.source).includes('?!api'),
  )
  assert.ok(catchAll, 'catch-all do admin deve excluir /api e /aluno')
  assert.equal(catchAll.destination, '/index.html')
  assert.match(String(catchAll.source), /aluno/)

  const last = vercel.rewrites[vercel.rewrites.length - 1]
  assert.equal(last.destination, '/index.html')
})

test('build raiz copia cria-frontend para dist/aluno', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  assert.match(pkg.scripts.build, /cria-frontend/)
  assert.match(pkg.scripts.build, /copy-aluno-dist\.mjs/)
  assert.equal(existsSync(join(root, 'scripts/copy-aluno-dist.mjs')), true)
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
