/**
 * Testes de regressão: summary não indexa agentes em trail_ids de progressão
 * e o classificador permanece alinhado à allowlist canônica.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const CANONICAL = [
  'Trilha - Matemática',
  'Trilha - Geral',
  'Trilha - Humanas',
  'Trilha - Natureza',
  'Tutor - Linguagens',
]

test('server/lib/agentUsage.ts exporta a allowlist canônica', () => {
  const src = readFileSync(join(root, 'server/lib/agentUsage.ts'), 'utf8')
  for (const id of CANONICAL) {
    assert.match(src, new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  assert.match(src, /export function isAgentTrailId/)
  assert.match(src, /export function aggregateAgentUsage/)
})

test('api/dashboard_summary agrega agent_usage e pula agentes na progressão', () => {
  const src = readFileSync(join(root, 'api/dashboard_summary.ts'), 'utf8')
  assert.match(src, /agent_usage/)
  assert.match(src, /isAgentTrailId/)
  assert.match(src, /aggregateAgentUsage/)
  // Agentes não devem ser indexados via trailIndexById no caminho de progressão
  assert.match(src, /if \(isAgentTrailId\(trailId\)\)/)
  // Extensão aditiva mode=kpis (default continua full).
  assert.match(src, /parseDashboardSummaryMode/)
  assert.match(src, /mode: 'kpis'/)
  assert.match(src, /active_student_count/)
})

test('dashboard do painel não faz fallback de conversation_logs no cliente', () => {
  const page = readFileSync(
    join(root, 'frontend/trilha-admin/src/pages/DashboardPage.tsx'),
    'utf8',
  )
  assert.doesNotMatch(page, /fetchConversationLogsForStudents/)
  assert.doesNotMatch(page, /CONVERSATION_LOGS_COLLECTION/)
  assert.match(page, /fetchDashboardKpisSummary/)
  assert.match(page, /fetchDashboardLogSummary/)
  assert.match(page, /agentUsage/)
  assert.match(page, /\[dashboard\] pronto em/)
})

test('StudentDetailPage filtra histórico por agent_trail_id', () => {
  const page = readFileSync(
    join(root, 'frontend/trilha-admin/src/pages/StudentDetailPage.tsx'),
    'utf8',
  )
  assert.match(page, /agent_trail_id/)
  assert.match(page, /agentTrailFilter/)
  assert.match(page, /where\('trail_id'/)
})

test('índice Firestore student_id + trail_id existe para filtro de agente', () => {
  const indexes = JSON.parse(
    readFileSync(join(root, 'firestore.indexes.json'), 'utf8'),
  )
  const hit = indexes.indexes.find(
    (idx) =>
      idx.collectionGroup === 'conversation_logs' &&
      Array.isArray(idx.fields) &&
      idx.fields.some((f) => f.fieldPath === 'student_id') &&
      idx.fields.some((f) => f.fieldPath === 'trail_id'),
  )
  assert.ok(hit, 'faltando índice conversation_logs student_id+trail_id')
})

test('dashboard libera gate em erro de first-load do summary', () => {
  const page = readFileSync(
    join(root, 'frontend/trilha-admin/src/pages/DashboardPage.tsx'),
    'utf8',
  )
  // Catch de first-load (mode=kpis) deve setar initialKpisLoaded para o banner/retry.
  assert.match(page, /setInitialKpisLoaded\(true\)/)
  assert.match(page, /fetchDashboardKpisSummary/)
  assert.match(page, /Não foi possível carregar|onRetryLogs/)
  assert.match(page, /agentUsagePresent/)
})

test('specs/10_AGENT_USAGE_DASHBOARD.md existe', () => {
  const src = readFileSync(
    join(root, 'specs/10_AGENT_USAGE_DASHBOARD.md'),
    'utf8',
  )
  assert.match(src, /Trilha - Matemática/)
  assert.match(src, /Tutor - Linguagens/)
})
