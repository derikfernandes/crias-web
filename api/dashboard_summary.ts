import { gunzipSync, gzipSync } from 'node:zlib'

import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

import {
  aggregateAgentUsage,
  isAgentTrailId,
  parsePeriodDays,
  periodCutoffMillis,
  type AgentUsageAggregate,
  type AgentUsageLogInput,
  type AgentUsageRow,
} from '../server/lib/agentUsage'
import {
  computeInstitutionDashboardMetrics,
  type InstitutionDashboardMetrics,
} from '../server/lib/dashboardInstitutionMetrics'
import {
  canAccessInstitution,
  requireGestaoAdminFromRequest,
} from '../server/lib/gestaoAdminAuth'
import { gestaoCorsHeaders } from '../server/lib/gestaoCors'

/**
 * Agregação server-side dos conversation_logs para o dashboard da gestão admin.
 *
 * Endpoint somente leitura (GET) sobre collections de alunos. Escrita permitida
 * apenas na collection derivada `gestao_dashboard_cache`.
 *
 * Exige Bearer Firebase ID token da Gestão.
 * Escola: só a própria instituição. Master/super: todas.
 *
 * Resposta (formato compacto para ficar bem abaixo do limite de 4,5 MB de
 * payload das functions da Vercel — trilhas são referenciadas por índice em
 * `trail_ids` e as chaves são "trailIdx|stage|question"):
 * {
 *   institution_id: string,
 *   student_count: number,
 *   trail_ids: string[],
 *   students: Record<studentId, {
 *     answers: Record<"trailIdx|stage|question", string>,
 *     extra_done: Array<"trailIdx|stage|question">
 *   }>,
 *   agent_usage: { ... },  // período pedido (period_days)
 *   agent_usage_by_period?: { "0"|"7"|"30": ... }
 * }
 *
 * O conjunto "feito" de cada aluno = chaves de `answers` + `extra_done`.
 * trail_ids de agente NÃO entram em trail_ids / students (progressão tN).
 *
 * Undated (at <= 0): NUNCA contam (Crias Todo inflava 22 vs 10).
 */

export const config = {
  maxDuration: 300,
}

type Json = Record<string, unknown>

const FIRESTORE_IN_LIMIT = 30

/** L1 em memória da instância (warm). */
const SUMMARY_CACHE_TTL_MS = 2 * 60_000
/** Cache Firestore "fresco": serve sem recompute (pedido owner: ≤10 min). */
export const FIRESTORE_CACHE_TTL_MS = 10 * 60_000
/**
 * Janela stale-while-revalidate: ainda serve o cache (escolas não pagam
 * o calc de 57k respostas) e regenera em background.
 */
const FIRESTORE_CACHE_STALE_MS = 24 * 60 * 60_000
const CACHE_COLLECTION = 'gestao_dashboard_cache'
/** Evita N regenerates paralelos da mesma instituição na instância. */
const recomputeInflight = new Map<string, Promise<void>>()
/** Bem abaixo do limite de 1 MiB do Firestore (~900KB pedido). */
const MAX_CHUNK_JSON_BYTES = 800_000
/**
 * Orçamento do doc meta (agent_usage + metrics + campos). Firestore = 1 MiB.
 * Sol estoura se metrics repetir agent completo + exercise_pills + students.
 */
const MAX_META_BUDGET_BYTES = 900_000
/** Sidecar de exercise_pills + students (fora do meta). */
const METRICS_SIDECAR_SUFFIX = '_m'
/** Schema v2: agregados em `payload` (string); só escalares indexáveis. */
export const CACHE_DOC_VERSION = 2
const COMPRESS_THRESHOLD_BYTES = 800_000
const MAX_FIRESTORE_DOC_BYTES = 950_000

type EncodedPayload = {
  payload: string
  encoding?: 'gzip-b64'
}

/** Serializa agregados como 1 string (gzip se >~800KB). Evita index explosion. */
export function encodeCachePayload(value: unknown): EncodedPayload {
  const json = JSON.stringify(value)
  const jsonBytes = Buffer.byteLength(json, 'utf8')
  if (jsonBytes <= COMPRESS_THRESHOLD_BYTES) {
    if (jsonBytes > MAX_FIRESTORE_DOC_BYTES) {
      throw new Error(
        `payload JSON ${jsonBytes}B excede limite Firestore (~1 MiB)`,
      )
    }
    return { payload: json }
  }
  const gz = gzipSync(Buffer.from(json, 'utf8'), { level: 6 })
  const b64 = gz.toString('base64')
  const b64Bytes = Buffer.byteLength(b64, 'utf8')
  if (b64Bytes > MAX_FIRESTORE_DOC_BYTES) {
    throw new Error(
      `payload gzip ${b64Bytes}B excede limite Firestore (~1 MiB)`,
    )
  }
  return { payload: b64, encoding: 'gzip-b64' }
}

/** Decodifica `payload` (+ encoding opcional). Compat: students_json legado. */
export function decodeCachePayload(data: Record<string, unknown>): unknown {
  if (typeof data.payload === 'string' && data.payload.length > 0) {
    try {
      if (data.encoding === 'gzip-b64') {
        const json = gunzipSync(Buffer.from(data.payload, 'base64')).toString(
          'utf8',
        )
        return JSON.parse(json)
      }
      return JSON.parse(data.payload)
    } catch {
      // fallback legado abaixo
    }
  }
  if (typeof data.students_json === 'string' && data.students_json.length > 0) {
    try {
      return JSON.parse(data.students_json)
    } catch {
      return null
    }
  }
  return null
}

const PERIOD_KEYS = [0, 7, 30] as const
type PeriodKey = (typeof PERIOD_KEYS)[number]

type StudentEntry = {
  answers: Record<string, string>
  extra_done: string[]
}

type StudentsMap = Record<string, StudentEntry>

type AgentUsageByPeriod = Record<'0' | '7' | '30', AgentUsageAggregate>

type SummaryPayload = {
  institution_id: string
  student_count: number
  trail_ids: string[]
  students: StudentsMap
  agent_usage_by_period: AgentUsageByPeriod
  /** Pré-agregado Início+Dados; client preferencial. */
  metrics?: InstitutionDashboardMetrics
}

const summaryCache = new Map<
  string,
  { expires: number; payload: SummaryPayload }
>()

function corsHeaders(request: Request): Record<string, string> {
  return gestaoCorsHeaders(request, 'GET,OPTIONS')
}

let cachedDb: ReturnType<typeof getFirestore> | null = null

function getDb() {
  if (cachedDb) return cachedDb

  const saJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON
  if (!saJson) {
    throw new Error(
      'FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON ausente. Defina no ambiente da Vercel.',
    )
  }

  const serviceAccount = JSON.parse(saJson) as ServiceAccount

  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount),
    })
  }

  cachedDb = getFirestore()
  return cachedDb
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

type AnswerCandidate = {
  text: string
  at: number
  isExercise: boolean
  logId: string
}

function logTimestampMillis(
  createdAt: unknown,
  createdAtBrasilia: unknown,
): number {
  if (
    createdAt &&
    typeof createdAt === 'object' &&
    'toMillis' in createdAt &&
    typeof (createdAt as { toMillis?: unknown }).toMillis === 'function'
  ) {
    try {
      const ms = (createdAt as { toMillis: () => number }).toMillis()
      if (ms > 0) return ms
    } catch {
      // usa fallback abaixo
    }
  }
  if (typeof createdAtBrasilia === 'string' && createdAtBrasilia) {
    const normalized = createdAtBrasilia.includes('T')
      ? createdAtBrasilia
      : createdAtBrasilia.replace(' ', 'T')
    const parsed = Date.parse(normalized)
    if (!Number.isNaN(parsed)) return parsed
  }
  return 0
}

/**
 * Filtro de período para uso de agentes.
 * Undated (at <= 0) NUNCA entram (Crias Todo inflava 22 vs 10 reais).
 * period 0: todos os datados; 7/30: at >= cutoff.
 */
export function agentLogInPeriod(at: number, cutoffMs: number): boolean {
  if (at <= 0) return false
  if (cutoffMs <= 0) return true
  return at >= cutoffMs
}

/** Mesma regra do dashboard: prefere respostas de exercício, depois a mais recente. */
function pickBestStudentAnswer(candidates: AnswerCandidate[]): string {
  if (candidates.length === 0) return ''
  const exercises = candidates.filter((c) => c.isExercise)
  const pool = exercises.length > 0 ? exercises : candidates
  pool.sort((a, b) => {
    if (b.at !== a.at) return b.at - a.at
    return b.logId.localeCompare(a.logId)
  })
  return pool[0].text
}

/** Uma passada: agrega agent_usage para 0, 7 e 30 a partir dos mesmos logs. */
export function aggregateAgentUsageByPeriod(
  agentLogs: AgentUsageLogInput[],
  nowMs: number = Date.now(),
): AgentUsageByPeriod {
  const cutoffs: Record<PeriodKey, number> = {
    0: 0,
    7: periodCutoffMillis(7, nowMs),
    30: periodCutoffMillis(30, nowMs),
  }
  const buckets: Record<PeriodKey, AgentUsageLogInput[]> = {
    0: [],
    7: [],
    30: [],
  }

  for (const log of agentLogs) {
    for (const period of PERIOD_KEYS) {
      if (agentLogInPeriod(log.at, cutoffs[period])) {
        buckets[period].push(log)
      }
    }
  }

  return {
    '0': aggregateAgentUsage(buckets[0], 0),
    '7': aggregateAgentUsage(buckets[7], 7),
    '30': aggregateAgentUsage(buckets[30], 30),
  }
}

function periodKey(periodDays: number): '0' | '7' | '30' {
  if (periodDays === 7) return '7'
  if (periodDays === 30) return '30'
  return '0'
}

function buildBody(
  payload: SummaryPayload,
  periodDays: number,
): Json {
  const key = periodKey(periodDays)
  return {
    institution_id: payload.institution_id,
    student_count: payload.student_count,
    trail_ids: payload.trail_ids,
    students: payload.students,
    agent_usage: payload.agent_usage_by_period[key],
    agent_usage_by_period: payload.agent_usage_by_period,
  }
}

/** Versão mínima (sem student_stats / student_ids) para caber no doc meta. */
function compactAgentUsageMinimal(usage: AgentUsageAggregate): Json {
  const allStudentIds = new Set<string>()
  for (const a of usage.agents) {
    for (const id of a.student_ids ?? []) {
      if (id) allStudentIds.add(id)
    }
  }
  return {
    period_days: usage.period_days,
    total_messages: usage.total_messages,
    // Período: alunos distintos (UI não depende de student_ids no compact).
    unique_students: allStudentIds.size,
    agents: usage.agents.map((a: AgentUsageRow) => ({
      trail_id: a.trail_id,
      label: a.label,
      messages: a.messages,
      unique_students: a.unique_students,
      pct_of_total: a.pct_of_total,
      last_activity: a.last_activity,
    })),
    series: usage.series,
  }
}

/**
 * Sempre mínimo no meta (sem student_stats / student_ids).
 * Evita "too many index entries" na Sol e mantém o doc pequeno.
 */
function compactAgentUsageByPeriod(byPeriod: AgentUsageByPeriod): Json {
  return {
    '0': compactAgentUsageMinimal(byPeriod['0']),
    '7': compactAgentUsageMinimal(byPeriod['7']),
    '30': compactAgentUsageMinimal(byPeriod['30']),
  }
}

type StoredMetrics = InstitutionDashboardMetrics & {
  /** true → exercise_pills/students estão em `{id}_m`. */
  metrics_sidecar?: boolean
}

type MetricsStorageParts = {
  metaMetrics: StoredMetrics
  sidecar: {
    exercise_pills: InstitutionDashboardMetrics['exercise_pills']
    students: InstitutionDashboardMetrics['students']
  } | null
}

function emptyAgentStub(periodDays: number): AgentUsageAggregate {
  return {
    period_days: periodDays,
    total_messages: 0,
    agents: [],
    series: [],
  }
}

/**
 * Empacota metrics para o meta caber sob 1 MiB.
 * - Não duplica agent_usage gordo no metrics (meta já tem o campo top-level).
 * - Se exercise_pills+students estouram o orçamento, vão para `{id}_m`.
 */
export function packMetricsForMeta(
  metrics: InstitutionDashboardMetrics,
  agentUsageBytes: number,
): MetricsStorageParts {
  // Stub vazio: readMetricsFromCache reinsere o agent do meta.
  const base: StoredMetrics = {
    ...metrics,
    agent_usage_by_period: {
      '0': emptyAgentStub(0),
      '7': emptyAgentStub(7),
      '30': emptyAgentStub(30),
    },
  }

  const overhead = 2_000 + agentUsageBytes
  const budget = Math.max(80_000, MAX_META_BUDGET_BYTES - overhead)
  if (JSON.stringify(base).length <= budget) {
    return { metaMetrics: base, sidecar: null }
  }

  const sidecar = {
    exercise_pills: base.exercise_pills,
    students: base.students,
  }
  const withFlag: StoredMetrics = {
    ...base,
    exercise_pills: [],
    students: [],
    metrics_sidecar: true,
  }
  if (JSON.stringify(withFlag).length > budget) {
    withFlag.stage_bars = withFlag.stage_bars.slice(0, 80)
  }
  return { metaMetrics: withFlag, sidecar }
}

/** Aplica sidecar ao metrics lido do meta. */
async function inflateMetricsSidecar(
  db: Firestore,
  institutionId: string,
  metrics: StoredMetrics,
): Promise<InstitutionDashboardMetrics> {
  if (!metrics.metrics_sidecar) {
    const { metrics_sidecar: _f, ...rest } = metrics
    return rest
  }
  const snap = await db
    .collection(CACHE_COLLECTION)
    .doc(`${institutionId}${METRICS_SIDECAR_SUFFIX}`)
    .get()
  const { metrics_sidecar: _flag, ...rest } = metrics
  if (!snap.exists) return rest
  const data = snap.data() as Record<string, unknown>
  let pills = rest.exercise_pills
  let students = rest.students
  const decoded = decodeCachePayload(data) as {
    exercise_pills?: InstitutionDashboardMetrics['exercise_pills']
    students?: InstitutionDashboardMetrics['students']
  } | null
  if (decoded && typeof decoded === 'object') {
    if (Array.isArray(decoded.exercise_pills)) pills = decoded.exercise_pills
    if (Array.isArray(decoded.students)) students = decoded.students
  } else {
    if (typeof data.exercise_pills_json === 'string') {
      try {
        const parsed = JSON.parse(data.exercise_pills_json) as unknown
        if (Array.isArray(parsed)) {
          pills = parsed as InstitutionDashboardMetrics['exercise_pills']
        }
      } catch {
        // ignore
      }
    } else if (Array.isArray(data.exercise_pills)) {
      pills = data.exercise_pills as InstitutionDashboardMetrics['exercise_pills']
    }
    if (typeof data.students_json === 'string') {
      try {
        const parsed = JSON.parse(data.students_json) as unknown
        if (Array.isArray(parsed)) {
          students = parsed as InstitutionDashboardMetrics['students']
        }
      } catch {
        // ignore
      }
    } else if (Array.isArray(data.students)) {
      students = data.students as InstitutionDashboardMetrics['students']
    }
  }
  return {
    ...rest,
    exercise_pills: pills,
    students,
    exercise_count:
      typeof rest.exercise_count === 'number' && rest.exercise_count > 0
        ? rest.exercise_count
        : pills.length,
  }
}

/**
 * Reconstrói AgentUsageAggregate a partir do compacto do meta.
 * student_stats / student_ids ficam vazios (drill-down só no MISS / L1 quente).
 */
function inflateCompactAgentUsage(raw: unknown, periodDays: number): AgentUsageAggregate {
  const empty: AgentUsageAggregate = {
    period_days: periodDays,
    total_messages: 0,
    agents: [],
    series: [],
  }
  if (!raw || typeof raw !== 'object') return empty
  const obj = raw as Record<string, unknown>
  const agentsRaw = Array.isArray(obj.agents) ? obj.agents : []
  const agents: AgentUsageRow[] = agentsRaw.map((row) => {
    const r = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>
    const messages = typeof r.messages === 'number' ? r.messages : 0
    const unique =
      typeof r.unique_students === 'number' ? r.unique_students : 0
    return {
      trail_id: typeof r.trail_id === 'string' ? r.trail_id : '',
      trail_ids:
        Array.isArray(r.trail_ids) && r.trail_ids.every((x) => typeof x === 'string')
          ? (r.trail_ids as string[])
          : typeof r.trail_id === 'string' && r.trail_id
            ? [r.trail_id]
            : [],
      label: typeof r.label === 'string' ? r.label : '',
      messages,
      unique_students: unique,
      pct_of_total: typeof r.pct_of_total === 'number' ? r.pct_of_total : 0,
      last_activity:
        typeof r.last_activity === 'string' || r.last_activity === null
          ? (r.last_activity as string | null)
          : null,
      student_ids: Array.isArray(r.student_ids)
        ? r.student_ids.filter((x): x is string => typeof x === 'string')
        : [],
      student_stats: Array.isArray(r.student_stats)
        ? (r.student_stats as AgentUsageRow['student_stats'])
        : [],
    }
  })
  const series = Array.isArray(obj.series)
    ? (obj.series as AgentUsageAggregate['series'])
    : []
  const uniquePeriod =
    typeof obj.unique_students === 'number' && obj.unique_students > 0
      ? obj.unique_students
      : agents.reduce((n, a) => n + (a.unique_students || 0), 0)
  return {
    period_days:
      typeof obj.period_days === 'number' ? obj.period_days : periodDays,
    total_messages:
      typeof obj.total_messages === 'number' ? obj.total_messages : 0,
    // Campo extra no JSON compact (tipo AgentUsageAggregate não declara).
    unique_students: uniquePeriod,
    agents,
    series,
  } as AgentUsageAggregate & { unique_students: number }
}

function inflateAgentUsageByPeriod(raw: unknown): AgentUsageByPeriod {
  const obj =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    '0': inflateCompactAgentUsage(obj['0'], 0),
    '7': inflateCompactAgentUsage(obj['7'], 7),
    '30': inflateCompactAgentUsage(obj['30'], 30),
  }
}

/**
 * Lê o mapa de answers de um chunk (v2 `payload` ou legado students_json/map).
 */
export function parseChunkStudents(data: Record<string, unknown>): StudentsMap {
  const decoded = decodeCachePayload(data)
  if (decoded && typeof decoded === 'object' && !Array.isArray(decoded)) {
    return decoded as StudentsMap
  }
  const map = data.students
  if (map && typeof map === 'object' && !Array.isArray(map)) {
    return map as StudentsMap
  }
  return {}
}

/** Parte o mapa `students` em pedaços com JSON serializado < MAX_CHUNK_JSON_BYTES. */
export function chunkStudentsMap(students: StudentsMap): StudentsMap[] {
  const entries = Object.entries(students)
  if (entries.length === 0) return [{}]

  const chunks: StudentsMap[] = []
  let current: StudentsMap = {}
  let currentBytes = 2 // `{}`

  for (const [studentId, entry] of entries) {
    const piece = JSON.stringify({ [studentId]: entry })
    // piece é `{...}`; ao fundir, somamos o miolo + vírgula.
    const addBytes = piece.length - 2 + (Object.keys(current).length > 0 ? 1 : 0)
    if (
      Object.keys(current).length > 0 &&
      currentBytes + addBytes > MAX_CHUNK_JSON_BYTES
    ) {
      chunks.push(current)
      current = {}
      currentBytes = 2
    }
    current[studentId] = entry
    const refreshed = JSON.stringify(current)
    currentBytes = refreshed.length
    // Se um único aluno estourar o teto, ainda assim vai sozinho (melhor que falhar).
    if (
      Object.keys(current).length === 1 &&
      currentBytes > MAX_CHUNK_JSON_BYTES
    ) {
      chunks.push(current)
      current = {}
      currentBytes = 2
    }
  }
  if (Object.keys(current).length > 0) chunks.push(current)
  return chunks.length > 0 ? chunks : [{}]
}

async function readFirestoreCache(
  db: Firestore,
  institutionId: string,
  opts?: { allowStale?: boolean },
): Promise<{ payload: SummaryPayload; stale: boolean } | null> {
  const col = db.collection(CACHE_COLLECTION)
  const metaRef = col.doc(institutionId)
  const metaSnap = await metaRef.get()
  if (!metaSnap.exists) return null

  const meta = metaSnap.data() as Record<string, unknown>
  const computedAt =
    typeof meta.computed_at === 'number' ? meta.computed_at : 0
  if (!computedAt) return null
  const age = Date.now() - computedAt
  if (age > FIRESTORE_CACHE_STALE_MS) return null
  const stale = age > FIRESTORE_CACHE_TTL_MS
  if (stale && !opts?.allowStale) return null

  const chunkCount =
    typeof meta.chunk_count === 'number' && meta.chunk_count >= 0
      ? meta.chunk_count
      : 0
  const studentCount =
    typeof meta.student_count === 'number' ? meta.student_count : 0

  const blob = decodeCachePayload(meta) as MetaPayloadBlob | null
  let trailIds: string[] = []
  let agentRaw: unknown = meta.agent_usage_by_period
  let metrics: InstitutionDashboardMetrics | undefined
  if (blob && typeof blob === 'object') {
    if (Array.isArray(blob.trail_ids)) trailIds = blob.trail_ids
    if (blob.agent_usage_by_period) agentRaw = blob.agent_usage_by_period
    if (blob.metrics && typeof blob.metrics === 'object') {
      metrics = blob.metrics
    }
  } else {
    // Legado v1 (campos aninhados indexados).
    trailIds = Array.isArray(meta.trail_ids)
      ? meta.trail_ids.filter((x): x is string => typeof x === 'string')
      : []
    if (meta.metrics && typeof meta.metrics === 'object') {
      metrics = meta.metrics as InstitutionDashboardMetrics
    }
  }

  const students: StudentsMap = {}
  if (chunkCount > 0) {
    const chunkRefs = Array.from({ length: chunkCount }, (_, i) =>
      col.doc(`${institutionId}_s${i}`),
    )
    const chunkSnaps = await db.getAll(...chunkRefs)
    for (const snap of chunkSnaps) {
      if (!snap.exists) continue
      const data = snap.data() as Record<string, unknown>
      const map = parseChunkStudents(data)
      for (const [sid, entry] of Object.entries(map)) {
        students[sid] = entry
      }
    }
  }

  return {
    payload: {
      institution_id: institutionId,
      student_count: studentCount,
      trail_ids: trailIds,
      students,
      agent_usage_by_period: inflateAgentUsageByPeriod(agentRaw),
      metrics,
    },
    stale,
  }
}

/** Lê só o doc meta (métricas + agent) — sem chunks de answers. */
export async function readMetricsFromCache(
  db: Firestore,
  institutionId: string,
  opts?: { allowStale?: boolean },
): Promise<{ metrics: InstitutionDashboardMetrics; stale: boolean; metaBytes?: number } | null> {
  const metaRef = db.collection(CACHE_COLLECTION).doc(institutionId)
  const metaSnap = await metaRef.get()
  if (!metaSnap.exists) return null
  const meta = metaSnap.data() as Record<string, unknown>
  const computedAt =
    typeof meta.computed_at === 'number'
      ? meta.computed_at
      : typeof meta.updatedAt === 'number'
        ? meta.updatedAt
        : 0
  if (!computedAt) return null
  const age = Date.now() - computedAt
  if (age > FIRESTORE_CACHE_STALE_MS) return null
  const stale = age > FIRESTORE_CACHE_TTL_MS
  if (stale && !opts?.allowStale) return null

  const blob = decodeCachePayload(meta) as MetaPayloadBlob | null
  let metricsRaw: unknown =
    blob && typeof blob === 'object' ? blob.metrics : meta.metrics
  let agentRaw: unknown =
    blob && typeof blob === 'object'
      ? blob.agent_usage_by_period
      : meta.agent_usage_by_period
  if (!metricsRaw || typeof metricsRaw !== 'object') return null
  let metrics = metricsRaw as StoredMetrics
  metrics = {
    ...metrics,
    agent_usage_by_period: inflateAgentUsageByPeriod(agentRaw),
  }
  if (!metrics.computed_at) metrics.computed_at = computedAt
  if (!metrics.institution_id) metrics.institution_id = institutionId
  metrics = (await inflateMetricsSidecar(
    db,
    institutionId,
    metrics,
  )) as StoredMetrics
  const metaBytes =
    typeof meta.payload === 'string'
      ? Buffer.byteLength(meta.payload, 'utf8')
      : JSON.stringify(meta).length
  return { metrics, stale, metaBytes }
}

type MetaPayloadBlob = {
  trail_ids: string[]
  agent_usage_by_period: Json
  metrics?: StoredMetrics
}

/** Apaga meta + chunks + sidecar (formato antigo indexado incluso). */
export async function deleteInstitutionCacheDocs(
  db: Firestore,
  institutionId: string,
): Promise<{ deleted: number }> {
  const col = db.collection(CACHE_COLLECTION)
  const metaRef = col.doc(institutionId)
  let previousChunkCount = 0
  try {
    const prev = await metaRef.get()
    if (prev.exists) {
      const n = (prev.data() as Record<string, unknown>).chunk_count
      if (typeof n === 'number' && n > 0) previousChunkCount = n
    }
  } catch {
    // ignore
  }
  // Cobre leftovers além do chunk_count (ex.: i2_s0 órfão).
  const maxScan = Math.max(previousChunkCount, 32)
  const batch = db.batch()
  let deleted = 0
  batch.delete(metaRef)
  deleted += 1
  batch.delete(col.doc(`${institutionId}${METRICS_SIDECAR_SUFFIX}`))
  deleted += 1
  for (let i = 0; i < maxScan; i++) {
    batch.delete(col.doc(`${institutionId}_s${i}`))
    deleted += 1
  }
  await batch.commit()
  return { deleted }
}

async function writeFirestoreCache(
  db: Firestore,
  payload: SummaryPayload,
): Promise<void> {
  const col = db.collection(CACHE_COLLECTION)
  const chunks = chunkStudentsMap(payload.students)
  const metaRef = col.doc(payload.institution_id)
  const sidecarRef = col.doc(
    `${payload.institution_id}${METRICS_SIDECAR_SUFFIX}`,
  )
  const now = Date.now()

  let previousChunkCount = 0
  try {
    const prev = await metaRef.get()
    if (prev.exists) {
      const n = (prev.data() as Record<string, unknown>).chunk_count
      if (typeof n === 'number' && n > 0) previousChunkCount = n
    }
  } catch {
    // best-effort
  }

  const agentCompact = compactAgentUsageByPeriod(payload.agent_usage_by_period)
  const agentUsageBytes = JSON.stringify(agentCompact).length
  const packed = payload.metrics
    ? packMetricsForMeta(payload.metrics, agentUsageBytes)
    : null

  const metaBlob: MetaPayloadBlob = {
    trail_ids: payload.trail_ids,
    agent_usage_by_period: agentCompact,
    ...(packed ? { metrics: packed.metaMetrics } : {}),
  }
  const metaEncoded = encodeCachePayload(metaBlob)

  // Firestore batch max 500; Sol cabe em poucos chunks.
  const batch = db.batch()
  batch.set(metaRef, {
    inst: payload.institution_id,
    scope: 'meta',
    version: CACHE_DOC_VERSION,
    updatedAt: now,
    // Escalares legados (stale checks / probe).
    institution_id: payload.institution_id,
    student_count: payload.student_count,
    computed_at: now,
    chunk_count: chunks.length,
    metrics_sidecar: Boolean(packed?.sidecar),
    ...metaEncoded,
  })

  chunks.forEach((students, i) => {
    const encoded = encodeCachePayload(students)
    batch.set(col.doc(`${payload.institution_id}_s${i}`), {
      inst: payload.institution_id,
      scope: 'answers',
      version: CACHE_DOC_VERSION,
      updatedAt: now,
      chunk_index: i,
      ...encoded,
    })
  })

  for (let i = chunks.length; i < previousChunkCount; i++) {
    batch.delete(col.doc(`${payload.institution_id}_s${i}`))
  }

  if (packed?.sidecar) {
    const sideEncoded = encodeCachePayload({
      exercise_pills: packed.sidecar.exercise_pills,
      students: packed.sidecar.students,
    })
    batch.set(sidecarRef, {
      inst: payload.institution_id,
      scope: 'metrics',
      version: CACHE_DOC_VERSION,
      updatedAt: now,
      ...sideEncoded,
    })
  } else {
    batch.delete(sidecarRef)
  }

  await batch.commit()
}

/** Grava só metrics (DERIVED) sem reescrever chunks de answers. */
async function writeMetricsOnly(
  db: Firestore,
  institutionId: string,
  metrics: InstitutionDashboardMetrics,
): Promise<{ metaBytes: number; sidecar: boolean }> {
  const col = db.collection(CACHE_COLLECTION)
  const metaRef = col.doc(institutionId)
  const sidecarRef = col.doc(`${institutionId}${METRICS_SIDECAR_SUFFIX}`)
  const now = Date.now()

  let agentUsage: Json = compactAgentUsageByPeriod({
    '0': emptyAgentStub(0),
    '7': emptyAgentStub(7),
    '30': emptyAgentStub(30),
  })
  let trailIds: string[] = []
  let studentCount = 0
  let chunkCount = 0
  try {
    const prev = await metaRef.get()
    if (prev.exists) {
      const data = prev.data() as Record<string, unknown>
      chunkCount =
        typeof data.chunk_count === 'number' ? data.chunk_count : 0
      studentCount =
        typeof data.student_count === 'number' ? data.student_count : 0
      const decoded = decodeCachePayload(data) as MetaPayloadBlob | null
      if (decoded && typeof decoded === 'object') {
        if (decoded.agent_usage_by_period) {
          agentUsage = decoded.agent_usage_by_period
        }
        if (Array.isArray(decoded.trail_ids)) trailIds = decoded.trail_ids
      } else if (data.agent_usage_by_period) {
        agentUsage = data.agent_usage_by_period as Json
      }
      if (Array.isArray(data.trail_ids)) {
        trailIds = data.trail_ids.filter((x): x is string => typeof x === 'string')
      }
    }
  } catch {
    // ignore
  }

  const agentUsageBytes = JSON.stringify(agentUsage).length
  const packed = packMetricsForMeta(metrics, agentUsageBytes)
  const metaBlob: MetaPayloadBlob = {
    trail_ids: trailIds,
    agent_usage_by_period: agentUsage,
    metrics: packed.metaMetrics,
  }
  const metaEncoded = encodeCachePayload(metaBlob)
  const batch = db.batch()
  batch.set(metaRef, {
    inst: institutionId,
    scope: 'meta',
    version: CACHE_DOC_VERSION,
    updatedAt: now,
    institution_id: institutionId,
    student_count: studentCount,
    computed_at: now,
    chunk_count: chunkCount,
    metrics_sidecar: Boolean(packed.sidecar),
    ...metaEncoded,
  })
  if (packed.sidecar) {
    const sideEncoded = encodeCachePayload({
      exercise_pills: packed.sidecar.exercise_pills,
      students: packed.sidecar.students,
    })
    batch.set(sidecarRef, {
      inst: institutionId,
      scope: 'metrics',
      version: CACHE_DOC_VERSION,
      updatedAt: now,
      ...sideEncoded,
    })
  } else {
    batch.delete(sidecarRef)
  }
  await batch.commit()
  return {
    metaBytes: Buffer.byteLength(metaEncoded.payload, 'utf8'),
    sidecar: Boolean(packed.sidecar),
  }
}

async function handleRequest(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request),
    })
  }

  const respond = (
    status: number,
    body: Json,
    extraHeaders?: Record<string, string>,
  ): Response => {
    return new Response(JSON.stringify(body), {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        ...corsHeaders(request),
        ...(extraHeaders ?? {}),
      },
    })
  }

  if (request.method !== 'GET') {
    return respond(405, { error: `Método ${request.method} não permitido` })
  }

  const url = new URL(request.url)
  const institutionId = url.searchParams.get('institution_id')?.trim()
  if (!institutionId) {
    return respond(400, { error: 'Informe "institution_id".' })
  }

  const periodDays = parsePeriodDays(url.searchParams.get('period_days'))
  const forceRefresh = url.searchParams.get('refresh') === '1'

  let db: ReturnType<typeof getFirestore>
  try {
    db = getDb()
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : 'Erro ao inicializar Firebase Admin.'
    return respond(500, { error: msg })
  }

  const auth = await requireGestaoAdminFromRequest(
    db,
    request.headers.get('Authorization'),
  )
  if (!auth.ok) {
    return respond(auth.status, { error: auth.error, code: auth.code })
  }
  if (!canAccessInstitution(auth.principal, institutionId)) {
    return respond(403, {
      error: 'Sem permissão para esta instituição.',
      code: 'forbidden',
    })
  }

  if (!forceRefresh) {
    // L1: um payload por instituição (todos os períodos já calculados).
    const l1 = summaryCache.get(institutionId)
    if (l1 && l1.expires > Date.now()) {
      return respond(200, buildBody(l1.payload, periodDays), {
        'Cache-Control': 'private, max-age=60',
        'X-Summary-Cache': 'HIT',
      })
    }

    // L2: Firestore derivado (fresco ou stale-while-revalidate).
    try {
      const fromFs = await readFirestoreCache(db, institutionId, {
        allowStale: true,
      })
      if (fromFs) {
        summaryCache.set(institutionId, {
          expires: Date.now() + SUMMARY_CACHE_TTL_MS,
          payload: fromFs.payload,
        })
        if (fromFs.stale) {
          scheduleSummaryRecompute(db, institutionId)
        }
        return respond(200, buildBody(fromFs.payload, periodDays), {
          'Cache-Control': 'private, max-age=60',
          'X-Summary-Cache': fromFs.stale ? 'FIRESTORE-STALE' : 'FIRESTORE',
        })
      }
    } catch {
      // Cache miss: segue para computar.
    }
  }

  try {
    const payload = await computeSummaryPayload(db, institutionId)
    summaryCache.set(institutionId, {
      expires: Date.now() + SUMMARY_CACHE_TTL_MS,
      payload,
    })
    try {
      await writeFirestoreCache(db, payload)
    } catch {
      // ignore
    }
    return respond(200, buildBody(payload, periodDays), {
      'Cache-Control': 'private, max-age=60',
      'X-Summary-Cache': forceRefresh ? 'REFRESH' : 'MISS',
    })
  } catch (e) {
    return respond(500, {
      error: e instanceof Error ? e.message : 'Erro interno',
    })
  }
}

/**
 * Regenera e persiste o summary (cron / warm / 1º request).
 * Lock por instituição: pedidos concorrentes aguardam o mesmo calc.
 */
export async function warmInstitutionSummary(
  institutionId: string,
): Promise<void> {
  const existing = recomputeInflight.get(institutionId)
  if (existing) {
    await existing
    return
  }
  const run = (async () => {
    try {
      const db = getDb()
      // Remove leftovers v1 (i2_s0 indexado) antes de gravar v2 payload.
      await deleteInstitutionCacheDocs(db, institutionId)
      const payload = await computeSummaryPayload(db, institutionId)
      summaryCache.set(institutionId, {
        expires: Date.now() + SUMMARY_CACHE_TTL_MS,
        payload,
      })
      await writeFirestoreCache(db, payload)
      console.info(
        `[dashboard_summary] warm ok ${institutionId} students=${payload.student_count} exercises=${payload.metrics?.exercise_count ?? 0}`,
      )
    } finally {
      recomputeInflight.delete(institutionId)
    }
  })()
  recomputeInflight.set(institutionId, run)
  await run
}

/**
 * Se o cache Firestore já tem answers (chunks) mas ainda sem `metrics`,
 * calcula o doc pequeno SEM rescanear conversation_logs (bem mais rápido).
 */
export async function ensureMetricsFromExistingCache(
  institutionId: string,
): Promise<InstitutionDashboardMetrics | null> {
  const db = getDb()
  const existing = await readFirestoreCache(db, institutionId, {
    allowStale: true,
  })
  if (!existing) return null
  if (existing.payload.metrics?.exercise_count != null) {
    return existing.payload.metrics
  }

  const studentsCollection = process.env.STUDENTS_COLLECTION ?? 'students'
  const trailsCollection = process.env.TRAILS_COLLECTION ?? 'trails'
  const studentTrailsCollection =
    process.env.STUDENT_TRAILS_COLLECTION ?? 'student_trails'
  const stagesCollection =
    process.env.TRAIL_STAGES_COLLECTION ?? 'trail_stages'
  const questionsCollection =
    process.env.TRAIL_STAGE_QUESTIONS_COLLECTION ?? 'trail_stage_questions'

  const trailIdList = existing.payload.trail_ids
  const [studentsSnap, trailsSnap, linksSnap] = await Promise.all([
    db
      .collection(studentsCollection)
      .where('institution_id', '==', institutionId)
      .select('name', 'active')
      .get(),
    db
      .collection(trailsCollection)
      .where('institution_id', '==', institutionId)
      .select('name', 'active')
      .get(),
    db
      .collection(studentTrailsCollection)
      .where('institution_id', '==', institutionId)
      .select('student_id', 'trail_id', 'status')
      .get(),
  ])

  let stages: Array<{
    trail_id: string
    stage_number: number
    stage_type?: string
    title?: string
  }> = []
  let questions: Array<{
    trail_id: string
    stage_number: number
    question_number: number
    title?: string
    correct_option?: string
    annulled?: boolean
    active?: boolean
  }> = []
  if (trailIdList.length > 0) {
    const trailChunks = chunkArray(trailIdList, FIRESTORE_IN_LIMIT)
    const [stageSnaps, questionSnaps] = await Promise.all([
      Promise.all(
        trailChunks.map((chunk) =>
          db
            .collection(stagesCollection)
            .where('trail_id', 'in', chunk)
            .select('trail_id', 'stage_number', 'stage_type', 'title')
            .get(),
        ),
      ),
      Promise.all(
        trailChunks.map((chunk) =>
          db
            .collection(questionsCollection)
            .where('trail_id', 'in', chunk)
            .select(
              'trail_id',
              'stage_number',
              'question_number',
              'title',
              'correct_option',
              'annulled',
              'active',
            )
            .get(),
        ),
      ),
    ])
    stages = stageSnaps.flatMap((snap) =>
      snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>
        return {
          trail_id: typeof data.trail_id === 'string' ? data.trail_id : '',
          stage_number:
            typeof data.stage_number === 'number' ? data.stage_number : 0,
          stage_type:
            typeof data.stage_type === 'string' ? data.stage_type : undefined,
          title: typeof data.title === 'string' ? data.title : undefined,
        }
      }),
    )
    questions = questionSnaps.flatMap((snap) =>
      snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>
        return {
          trail_id: typeof data.trail_id === 'string' ? data.trail_id : '',
          stage_number:
            typeof data.stage_number === 'number' ? data.stage_number : 0,
          question_number:
            typeof data.question_number === 'number'
              ? data.question_number
              : 0,
          title: typeof data.title === 'string' ? data.title : undefined,
          correct_option:
            typeof data.correct_option === 'string'
              ? data.correct_option
              : undefined,
          annulled: data.annulled === true,
          active: data.active === false ? false : true,
        }
      }),
    )
  }

  const metrics = computeInstitutionDashboardMetrics({
    institutionId,
    trailIds: trailIdList,
    studentsMap: existing.payload.students,
    students: studentsSnap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>
      return {
        id: d.id,
        name: typeof data.name === 'string' ? data.name : d.id,
        active: data.active === false ? false : true,
      }
    }),
    trails: trailsSnap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>
      return {
        id: d.id,
        name: typeof data.name === 'string' ? data.name : d.id,
        active: data.active === false ? false : true,
      }
    }),
    studentTrails: linksSnap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>
      return {
        student_id:
          typeof data.student_id === 'string' ? data.student_id : '',
        trail_id: typeof data.trail_id === 'string' ? data.trail_id : '',
        status: typeof data.status === 'string' ? data.status : undefined,
      }
    }),
    questions,
    stages,
    agentUsageByPeriod: existing.payload.agent_usage_by_period,
  })

  const payload: SummaryPayload = { ...existing.payload, metrics }
  summaryCache.set(institutionId, {
    expires: Date.now() + SUMMARY_CACHE_TTL_MS,
    payload,
  })
  // Atualiza só o meta (+ sidecar se preciso); mantém chunks de answers.
  const wrote = await writeMetricsOnly(db, institutionId, metrics)
  console.info(
    `[dashboard_summary] DERIVED metrics ${institutionId} meta~${wrote.metaBytes}B sidecar=${wrote.sidecar}`,
  )

  return metrics
}

function scheduleSummaryRecompute(_db: Firestore, institutionId: string): void {
  void warmInstitutionSummary(institutionId).catch((err) => {
    console.warn('[dashboard_summary] recompute falhou', institutionId, err)
  })
}

async function computeSummaryPayload(
  db: Firestore,
  institutionId: string,
): Promise<SummaryPayload> {
  const studentsCollection = process.env.STUDENTS_COLLECTION ?? 'students'
  const trailsCollection = process.env.TRAILS_COLLECTION ?? 'trails'
  const logsCollection =
    process.env.CONVERSATION_LOGS_COLLECTION ?? 'conversation_logs'

  const studentTrailsCollection =
    process.env.STUDENT_TRAILS_COLLECTION ?? 'student_trails'
  const stagesCollection =
    process.env.TRAIL_STAGES_COLLECTION ?? 'trail_stages'
  const questionsCollection =
    process.env.TRAIL_STAGE_QUESTIONS_COLLECTION ?? 'trail_stage_questions'

  // Alunos/trilhas com campos necessários à métrica (nome, active).
  const [studentsSnap, trailsSnap, linksSnap] = await Promise.all([
    db
      .collection(studentsCollection)
      .where('institution_id', '==', institutionId)
      .select('name', 'active')
      .get(),
    db
      .collection(trailsCollection)
      .where('institution_id', '==', institutionId)
      .select('name', 'active')
      .get(),
    db
      .collection(studentTrailsCollection)
      .where('institution_id', '==', institutionId)
      .select('student_id', 'trail_id', 'status')
      .get(),
  ])

  const studentIds = studentsSnap.docs.map((d) => d.id)
  const trailIdList = trailsSnap.docs.map((d) => d.id)
  const trailIndexById = new Map(trailIdList.map((id, idx) => [id, idx]))

  /** studentId -> chave compacta "trailIdx|stage|question" -> candidatos. */
  const perStudent = new Map<string, Map<string, AnswerCandidate[]>>()
  const agentLogs: AgentUsageLogInput[] = []

  const chunks = chunkArray(studentIds, FIRESTORE_IN_LIMIT)
  await Promise.all(
    chunks.map(async (chunk) => {
      // Sem filtro de sender: progressão usa sender=student; agentes contam todos.
      const snap = await db
        .collection(logsCollection)
        .where('student_id', 'in', chunk)
        .select(
          'student_id',
          'trail_id',
          'stage_number',
          'question_number',
          'message_text',
          'message_type',
          'sender',
          'created_at',
          'created_at_brasilia',
        )
        .get()

      for (const doc of snap.docs) {
        const data = doc.data() as Record<string, unknown>

        const studentId =
          typeof data.student_id === 'string' ? data.student_id : ''
        const trailId = typeof data.trail_id === 'string' ? data.trail_id : ''
        if (!studentId || !trailId) continue

        const at = logTimestampMillis(data.created_at, data.created_at_brasilia)

        if (isAgentTrailId(trailId)) {
          // Coleta todos; filtro de período na agregação multi-período.
          agentLogs.push({ student_id: studentId, trail_id: trailId, at })
          continue
        }

        // Progressão: apenas mensagens do aluno em trilhas reais da instituição.
        if (data.sender !== 'student') continue
        const trailIdx = trailIndexById.get(trailId)
        if (trailIdx === undefined) continue

        const stageRaw = data.stage_number
        const questionRaw = data.question_number
        const stageNumber =
          typeof stageRaw === 'number' && Number.isFinite(stageRaw)
            ? stageRaw
            : 0
        const questionNumber =
          typeof questionRaw === 'number' && Number.isFinite(questionRaw)
            ? questionRaw
            : 0
        if (stageNumber < 1 || questionNumber < 1) continue

        const compactKey = `${trailIdx}|${stageNumber}|${questionNumber}`
        let byKey = perStudent.get(studentId)
        if (!byKey) {
          byKey = new Map()
          perStudent.set(studentId, byKey)
        }
        const list = byKey.get(compactKey) ?? []
        list.push({
          text: typeof data.message_text === 'string' ? data.message_text : '',
          at,
          isExercise: data.message_type === 'exercise',
          logId: doc.id,
        })
        byKey.set(compactKey, list)
      }
    }),
  )

  const students: StudentsMap = {}
  for (const [studentId, byKey] of perStudent) {
    const answers: Record<string, string> = {}
    const extraDone: string[] = []
    for (const [key, candidates] of byKey) {
      const best = pickBestStudentAnswer(candidates)
      if (best.trim()) answers[key] = best
      else extraDone.push(key)
    }
    students[studentId] = { answers, extra_done: extraDone }
  }

  const agent_usage_by_period = aggregateAgentUsageByPeriod(agentLogs)

  // Catálogo (stages/questions) para gabarito + contagem de exercícios.
  let stages: Array<{
    trail_id: string
    stage_number: number
    stage_type?: string
    title?: string
  }> = []
  let questions: Array<{
    trail_id: string
    stage_number: number
    question_number: number
    title?: string
    correct_option?: string
    annulled?: boolean
    active?: boolean
  }> = []
  if (trailIdList.length > 0) {
    const trailChunks = chunkArray(trailIdList, FIRESTORE_IN_LIMIT)
    const [stageSnaps, questionSnaps] = await Promise.all([
      Promise.all(
        trailChunks.map((chunk) =>
          db
            .collection(stagesCollection)
            .where('trail_id', 'in', chunk)
            .select('trail_id', 'stage_number', 'stage_type', 'title')
            .get(),
        ),
      ),
      Promise.all(
        trailChunks.map((chunk) =>
          db
            .collection(questionsCollection)
            .where('trail_id', 'in', chunk)
            .select(
              'trail_id',
              'stage_number',
              'question_number',
              'title',
              'correct_option',
              'annulled',
              'active',
            )
            .get(),
        ),
      ),
    ])
    stages = stageSnaps.flatMap((snap) =>
      snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>
        return {
          trail_id: typeof data.trail_id === 'string' ? data.trail_id : '',
          stage_number:
            typeof data.stage_number === 'number' ? data.stage_number : 0,
          stage_type:
            typeof data.stage_type === 'string' ? data.stage_type : undefined,
          title: typeof data.title === 'string' ? data.title : undefined,
        }
      }),
    )
    questions = questionSnaps.flatMap((snap) =>
      snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>
        return {
          trail_id: typeof data.trail_id === 'string' ? data.trail_id : '',
          stage_number:
            typeof data.stage_number === 'number' ? data.stage_number : 0,
          question_number:
            typeof data.question_number === 'number'
              ? data.question_number
              : 0,
          title: typeof data.title === 'string' ? data.title : undefined,
          correct_option:
            typeof data.correct_option === 'string'
              ? data.correct_option
              : undefined,
          annulled: data.annulled === true,
          active: data.active === false ? false : true,
        }
      }),
    )
  }

  const metrics = computeInstitutionDashboardMetrics({
    institutionId,
    trailIds: trailIdList,
    studentsMap: students,
    students: studentsSnap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>
      return {
        id: d.id,
        name: typeof data.name === 'string' ? data.name : d.id,
        active: data.active === false ? false : true,
      }
    }),
    trails: trailsSnap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>
      return {
        id: d.id,
        name: typeof data.name === 'string' ? data.name : d.id,
        active: data.active === false ? false : true,
      }
    }),
    studentTrails: linksSnap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>
      return {
        student_id:
          typeof data.student_id === 'string' ? data.student_id : '',
        trail_id: typeof data.trail_id === 'string' ? data.trail_id : '',
        status: typeof data.status === 'string' ? data.status : undefined,
      }
    }),
    questions,
    stages,
    agentUsageByPeriod: agent_usage_by_period,
  })

  return {
    institution_id: institutionId,
    student_count: studentIds.length,
    trail_ids: trailIdList,
    students,
    agent_usage_by_period,
    metrics,
  }
}

export default async function handler(req: any, res: any): Promise<void> {
  const method = (req?.method ?? 'GET') as string
  const host = (req?.headers?.host ?? 'localhost') as string
  const path = (req?.url ?? '/') as string
  const url = new URL(path, `https://${host}`)

  const headers = new Headers()
  const rawHeaders = (req?.headers ?? {}) as Record<string, unknown>
  for (const [k, v] of Object.entries(rawHeaders)) {
    if (typeof v === 'string') headers.set(k, v)
    else if (Array.isArray(v)) headers.set(k, v.join(','))
  }

  const response = await handleRequest(
    new Request(url.toString(), { method, headers }),
  )

  res.statusCode = response.status
  response.headers.forEach((value, key) => {
    try {
      res.setHeader(key, value)
    } catch {
      // ignora headers inválidos no ambiente serverless
    }
  })

  const ab = await response.arrayBuffer()
  res.end(Buffer.from(ab))
}
