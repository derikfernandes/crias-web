/**
 * Cliente do /api/dashboard_metrics — payload pré-agregado (KB).
 * Início e Dados NÃO baixam answerMap da Sol.
 */

import {
  EMPTY_AGENT_USAGE,
  agentLabelForTrailId,
  type AgentUsagePeriodDays,
  type AgentUsageView,
} from './agentUsage'
import { gestaoAuthHeaders } from './gestaoAuthHeaders'

export type MetricsPillView = {
  key: string
  trailId: string
  trailName: string
  stageNumber: number
  questionNumber: number
  title: string
  gabarito: string
  total: number
  correct: number
  wrong: number
  accuracyPct: number
}

export type MetricsStudentView = {
  id: string
  name: string
  active: boolean
  done: number
  released: number
  lessonsDone: number
  lessonsReleased: number
  correct: number
  wrong: number
  accuracyPct: number | null
}

export type InstitutionDashboardMetricsView = {
  institutionId: string
  computedAt: number
  activeStudents: number
  activeTrails: number
  avgCompletion: number | null
  avgLessonCompletion: number | null
  avgAccuracy: number | null
  accuracyCorrect: number
  accuracyTried: number
  exerciseCount: number
  worstPills: MetricsPillView[]
  bestPills: MetricsPillView[]
  exercisePills: MetricsPillView[]
  stageBars: {
    key: string
    trailId: string
    trailName: string
    stageNumber: number
    label: string
    count: number
    enrolledCount: number
  }[]
  students: MetricsStudentView[]
  agentUsageByPeriod: Partial<Record<AgentUsagePeriodDays, AgentUsageView>>
}

const session = new Map<string, InstitutionDashboardMetricsView>()

export function getCachedMetrics(
  institutionId: string,
): InstitutionDashboardMetricsView | undefined {
  return session.get(institutionId)
}

export function setCachedMetrics(
  institutionId: string,
  metrics: InstitutionDashboardMetricsView,
): void {
  session.set(institutionId, metrics)
}

export function clearMetricsCache(): void {
  session.clear()
}

function resolveApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL?.trim()
  if (raw) return raw.replace(/\/+$/, '')
  return window.location.origin
}

type AgentApi = {
  period_days?: number
  total_messages?: number
  unique_students?: number
  agents?: Array<{
    trail_id?: string
    trail_ids?: string[]
    label?: string
    messages?: number
    unique_students?: number
    pct_of_total?: number
    last_activity?: string | null
    student_ids?: string[]
    student_stats?: Array<{
      student_id?: string
      messages?: number
      last_activity?: string | null
    }>
  }>
  series?: Array<{ date?: string; trail_id?: string; messages?: number }>
}

type MetricsResponse = {
  institution_id?: string
  computed_at?: number
  active_students?: number
  active_trails?: number
  avg_completion?: number | null
  avg_lesson_completion?: number | null
  avg_accuracy?: number | null
  accuracy_correct?: number
  accuracy_tried?: number
  exercise_count?: number
  worst_pills?: Array<Record<string, unknown>>
  best_pills?: Array<Record<string, unknown>>
  exercise_pills?: Array<Record<string, unknown>>
  stage_bars?: Array<Record<string, unknown>>
  students?: Array<Record<string, unknown>>
  agent_usage_by_period?: Partial<Record<'0' | '7' | '30', AgentApi>>
  error?: string
}

function parsePill(raw: Record<string, unknown>): MetricsPillView {
  return {
    key: String(raw.key ?? ''),
    trailId: String(raw.trail_id ?? ''),
    trailName: String(raw.trail_name ?? ''),
    stageNumber: Number(raw.stage_number ?? 0),
    questionNumber: Number(raw.question_number ?? 0),
    title: String(raw.title ?? ''),
    gabarito: String(raw.gabarito ?? ''),
    total: Number(raw.total ?? 0),
    correct: Number(raw.correct ?? 0),
    wrong: Number(raw.wrong ?? 0),
    accuracyPct: Number(raw.accuracy_pct ?? 0),
  }
}

function parseAgent(raw: AgentApi | undefined, period: AgentUsagePeriodDays): AgentUsageView {
  if (!raw || typeof raw !== 'object') {
    return { ...EMPTY_AGENT_USAGE, periodDays: period }
  }
  const agents = (raw.agents ?? []).map((a) => {
    const trailId = (a.trail_id ?? '').trim() || 'unknown'
    return {
      trailId,
      trailIds: Array.isArray(a.trail_ids) ? a.trail_ids.filter(Boolean) : [trailId],
      label: (a.label ?? '').trim() || agentLabelForTrailId(trailId),
      messages: typeof a.messages === 'number' ? a.messages : 0,
      uniqueStudents:
        typeof a.unique_students === 'number' ? a.unique_students : 0,
      pctOfTotal: typeof a.pct_of_total === 'number' ? a.pct_of_total : 0,
      lastActivity: a.last_activity ?? null,
      studentIds: Array.isArray(a.student_ids)
        ? a.student_ids.filter((x): x is string => typeof x === 'string')
        : [],
      studentStats: Array.isArray(a.student_stats)
        ? a.student_stats.map((st) => ({
            studentId: st.student_id ?? '',
            messages: typeof st.messages === 'number' ? st.messages : 0,
            lastActivity: st.last_activity ?? null,
          }))
        : [],
    }
  })
  const uniqueFromAgents = agents.reduce((n, a) => n + (a.uniqueStudents || 0), 0)
  const uniqueFromIds = new Set(agents.flatMap((a) => a.studentIds)).size
  return {
    periodDays: period,
    totalMessages:
      typeof raw.total_messages === 'number' ? raw.total_messages : 0,
    uniqueStudents:
      typeof raw.unique_students === 'number' && raw.unique_students > 0
        ? raw.unique_students
        : uniqueFromIds > 0
          ? uniqueFromIds
          : uniqueFromAgents,
    agents,
    series: Array.isArray(raw.series)
      ? raw.series.map((p) => ({
          date: p.date ?? '',
          trailId: p.trail_id ?? '',
          messages: typeof p.messages === 'number' ? p.messages : 0,
        }))
      : [],
  }
}

function parseMetrics(body: MetricsResponse): InstitutionDashboardMetricsView {
  const byPeriod: Partial<Record<AgentUsagePeriodDays, AgentUsageView>> = {}
  const rawBy = body.agent_usage_by_period
  if (rawBy) {
    for (const key of ['0', '7', '30'] as const) {
      const period = (Number(key) === 7 || Number(key) === 30
        ? Number(key)
        : 0) as AgentUsagePeriodDays
      if (rawBy[key]) byPeriod[period] = parseAgent(rawBy[key], period)
    }
  }
  return {
    institutionId: body.institution_id ?? '',
    computedAt: typeof body.computed_at === 'number' ? body.computed_at : 0,
    activeStudents: Number(body.active_students ?? 0),
    activeTrails: Number(body.active_trails ?? 0),
    avgCompletion:
      body.avg_completion === null || body.avg_completion === undefined
        ? null
        : Number(body.avg_completion),
    avgLessonCompletion:
      body.avg_lesson_completion === null ||
      body.avg_lesson_completion === undefined
        ? null
        : Number(body.avg_lesson_completion),
    avgAccuracy:
      body.avg_accuracy === null || body.avg_accuracy === undefined
        ? null
        : Number(body.avg_accuracy),
    accuracyCorrect: Number(body.accuracy_correct ?? 0),
    accuracyTried: Number(body.accuracy_tried ?? 0),
    exerciseCount: Number(body.exercise_count ?? 0),
    worstPills: (body.worst_pills ?? []).map(parsePill),
    bestPills: (body.best_pills ?? []).map(parsePill),
    exercisePills: (body.exercise_pills ?? []).map(parsePill),
    stageBars: (body.stage_bars ?? []).map((b) => ({
      key: String(b.key ?? ''),
      trailId: String(b.trail_id ?? ''),
      trailName: String(b.trail_name ?? ''),
      stageNumber: Number(b.stage_number ?? 0),
      label: String(b.label ?? ''),
      count: Number(b.count ?? 0),
      enrolledCount: Number(b.enrolled_count ?? 0),
    })),
    students: (body.students ?? []).map((s) => ({
      id: String(s.id ?? ''),
      name: String(s.name ?? ''),
      active: s.active !== false,
      done: Number(s.done ?? 0),
      released: Number(s.released ?? 0),
      lessonsDone: Number(s.lessons_done ?? 0),
      lessonsReleased: Number(s.lessons_released ?? 0),
      correct: Number(s.correct ?? 0),
      wrong: Number(s.wrong ?? 0),
      accuracyPct:
        s.accuracy_pct === null || s.accuracy_pct === undefined
          ? null
          : Number(s.accuracy_pct),
    })),
    agentUsageByPeriod: byPeriod,
  }
}

const inflight = new Map<string, Promise<InstitutionDashboardMetricsView>>()

/**
 * Timeout do client. Miss frio (gera Sol) pode levar dezenas de segundos;
 * após cache/HIT o retorno é sub-segundo. Evita "Carregando…" eterno se a function cair.
 */
export const METRICS_CLIENT_TIMEOUT_MS = 55_000
/** Revalidação SWR (já tem sessão): falha rápido. */
export const METRICS_SWR_TIMEOUT_MS = 12_000

/** Fetch métricas; usa sessão; SWR se já houver cache.
 *  `force` (refresh=1) só para botão Atualizar explícito; load normal nunca força. */
export async function fetchInstitutionMetrics(
  institutionId: string,
  opts?: { force?: boolean; timeoutMs?: number },
): Promise<InstitutionDashboardMetricsView> {
  const id = institutionId.trim()
  if (!id) throw new Error('institution_id vazio')

  const hadSession = Boolean(session.get(id))
  if (!opts?.force) {
    const hit = session.get(id)
    if (hit) return hit
    const pending = inflight.get(id)
    if (pending) return pending
  }

  const timeoutMs =
    opts?.timeoutMs ??
    (hadSession && !opts?.force
      ? METRICS_SWR_TIMEOUT_MS
      : METRICS_CLIENT_TIMEOUT_MS)

  const run = (async () => {
    const url = new URL('/api/dashboard_metrics', resolveApiBaseUrl())
    url.searchParams.set('institution_id', id)
    if (opts?.force) url.searchParams.set('refresh', '1')
    const headers = await gestaoAuthHeaders()
    const started = performance.now()
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), timeoutMs)
    let res: Response
    try {
      res = await fetch(url.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json', ...headers },
        credentials: 'same-origin',
        signal: controller.signal,
      })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error(
          `Tempo esgotado ao carregar métricas (${Math.round(timeoutMs / 1000)}s).`,
        )
      }
      throw err
    } finally {
      window.clearTimeout(timer)
    }
    const body = (await res.json().catch(() => null)) as MetricsResponse | null
    if (!res.ok) {
      throw new Error(
        body?.error?.trim() ||
          `Falha ao carregar métricas (HTTP ${res.status}).`,
      )
    }
    if (!body || typeof body.institution_id !== 'string') {
      throw new Error('Resposta inválida de /api/dashboard_metrics.')
    }
    const parsed = parseMetrics(body)
    session.set(id, parsed)
    console.info(
      `[metrics] ${id} ${Math.round(performance.now() - started)}ms cache=${res.headers.get('X-Metrics-Cache') ?? '?'} acerto=${parsed.avgAccuracy} exercicios=${parsed.exerciseCount}`,
    )
    return parsed
  })()

  inflight.set(id, run)
  try {
    return await run
  } finally {
    inflight.delete(id)
  }
}

/** Soma ponderada multi-instituição. */
export function mergeMetricsViews(
  parts: InstitutionDashboardMetricsView[],
): {
  avgAccuracy: number | null
  accuracyCorrect: number
  accuracyTried: number
  exerciseCount: number
  activeStudents: number
  activeTrails: number
  avgCompletion: number | null
  avgLessonCompletion: number | null
} {
  let accuracyCorrect = 0
  let accuracyTried = 0
  let exerciseCount = 0
  let activeStudents = 0
  let activeTrails = 0
  let done = 0
  let released = 0
  let lessonsDone = 0
  let lessonsReleased = 0
  for (const p of parts) {
    accuracyCorrect += p.accuracyCorrect
    accuracyTried += p.accuracyTried
    exerciseCount += p.exerciseCount
    activeStudents += p.activeStudents
    activeTrails += p.activeTrails
    for (const s of p.students) {
      done += s.done
      released += s.released
      lessonsDone += s.lessonsDone
      lessonsReleased += s.lessonsReleased
    }
  }
  const pct = (n: number, d: number) =>
    d > 0 ? Math.round((n / d) * 1000) / 10 : null
  return {
    avgAccuracy: pct(accuracyCorrect, accuracyTried),
    accuracyCorrect,
    accuracyTried,
    exerciseCount,
    activeStudents,
    activeTrails,
    avgCompletion: pct(done, released),
    avgLessonCompletion: pct(lessonsDone, lessonsReleased),
  }
}

export function agentUsageFromMetrics(
  metrics: InstitutionDashboardMetricsView | undefined,
  periodDays: AgentUsagePeriodDays,
): AgentUsageView | undefined {
  return metrics?.agentUsageByPeriod[periodDays]
}
