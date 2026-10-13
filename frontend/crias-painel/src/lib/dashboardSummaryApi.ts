/**
 * Cliente do endpoint /api/dashboard_summary: agregação server-side dos
 * conversation_logs, evitando baixar todos os logs brutos no browser.
 *
 * O endpoint devolve um formato compacto (trilhas referenciadas por índice e
 * chaves "trailIdx|stage|question"); aqui as chaves são expandidas para o
 * formato que o dashboard já usava: "trailId|stage|question".
 */

import {
  EMPTY_AGENT_USAGE,
  mergeAgentRowsByLabel,
  type AgentUsagePeriodDays,
  type AgentUsageRowView,
  type AgentUsageView,
} from './agentUsage'

export type DashboardLogSummary = {
  doneByStudent: Map<string, Set<string>>
  answerMap: Map<string, string>
  agentUsage: AgentUsageView
  /** False quando a resposta OK omite `agent_usage` (deploy antigo / contrato incompleto). */
  agentUsagePresent: boolean
}

function resolveApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL?.trim()
  if (raw) return raw.replace(/\/+$/, '')
  return window.location.origin
}

type AgentUsageApiStudentStat = {
  student_id?: string
  messages?: number
  last_activity?: string | null
}

type AgentUsageApiRow = {
  trail_id?: string
  trail_ids?: string[]
  label?: string
  messages?: number
  unique_students?: number
  pct_of_total?: number
  last_activity?: string | null
  student_ids?: string[]
  student_stats?: AgentUsageApiStudentStat[]
}

type AgentUsageApiSeries = {
  date?: string
  trail_id?: string
  messages?: number
}

type DashboardSummaryResponse = {
  trail_ids?: string[]
  students?: Record<
    string,
    { answers?: Record<string, string>; extra_done?: string[] }
  >
  agent_usage?: {
    period_days?: number
    total_messages?: number
    agents?: AgentUsageApiRow[]
    series?: AgentUsageApiSeries[]
  }
  error?: string
}

function expandKey(compactKey: string, trailIds: string[]): string | null {
  const sep = compactKey.indexOf('|')
  if (sep < 0) return null
  const trailIdx = Number(compactKey.slice(0, sep))
  const trailId = trailIds[trailIdx]
  if (!trailId) return null
  return `${trailId}${compactKey.slice(sep)}`
}

function parsePeriodDays(value: unknown): AgentUsagePeriodDays {
  if (value === 7 || value === 30) return value
  return 0
}

function parseAgentUsage(
  raw: DashboardSummaryResponse['agent_usage'],
): AgentUsageView {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_AGENT_USAGE }

  const parsedRows: AgentUsageRowView[] = Array.isArray(raw.agents)
    ? raw.agents
        .filter((row) => typeof row?.trail_id === 'string' && row.trail_id.trim())
        .map((row) => {
          const trailId = String(row.trail_id).trim()
          const trailIds = Array.isArray(row.trail_ids)
            ? [
                ...new Set(
                  row.trail_ids
                    .filter((id): id is string => typeof id === 'string')
                    .map((id) => id.trim())
                    .filter(Boolean)
                    .concat(trailId),
                ),
              ]
            : [trailId]

          const studentStats = Array.isArray(row.student_stats)
            ? row.student_stats
                .filter(
                  (st) =>
                    typeof st?.student_id === 'string' && st.student_id.trim(),
                )
                .map((st) => ({
                  studentId: String(st.student_id).trim(),
                  messages: typeof st.messages === 'number' ? st.messages : 0,
                  lastActivity:
                    typeof st.last_activity === 'string'
                      ? st.last_activity
                      : null,
                }))
            : []

          const studentIds =
            studentStats.length > 0
              ? studentStats.map((s) => s.studentId)
              : Array.isArray(row.student_ids)
                ? row.student_ids.filter(
                    (id): id is string => typeof id === 'string',
                  )
                : []

          return {
            trailId,
            trailIds,
            label:
              typeof row.label === 'string' && row.label.trim()
                ? row.label.trim()
                : trailId,
            messages: typeof row.messages === 'number' ? row.messages : 0,
            uniqueStudents:
              typeof row.unique_students === 'number'
                ? row.unique_students
                : studentIds.length,
            pctOfTotal:
              typeof row.pct_of_total === 'number' ? row.pct_of_total : 0,
            lastActivity:
              typeof row.last_activity === 'string' ? row.last_activity : null,
            studentIds,
            studentStats:
              studentStats.length > 0
                ? studentStats
                : studentIds.map((id) => ({
                    studentId: id,
                    messages: 0,
                    lastActivity: null,
                  })),
          }
        })
    : []

  // Rede de segurança: se a API ainda emitir aliases separados, funde por label.
  const agents = mergeAgentRowsByLabel(parsedRows)

  const series = Array.isArray(raw.series)
    ? raw.series
        .filter(
          (p) =>
            typeof p?.date === 'string' &&
            typeof p?.trail_id === 'string' &&
            typeof p?.messages === 'number',
        )
        .map((p) => ({
          date: String(p.date),
          trailId: String(p.trail_id),
          messages: Number(p.messages),
        }))
    : []

  return {
    periodDays: parsePeriodDays(raw.period_days),
    totalMessages:
      typeof raw.total_messages === 'number' ? raw.total_messages : 0,
    agents,
    series,
  }
}

export async function fetchDashboardLogSummary(
  institutionId: string,
  periodDays: AgentUsagePeriodDays = 0,
): Promise<DashboardLogSummary> {
  const url = new URL('/api/dashboard_summary', resolveApiBaseUrl())
  url.searchParams.set('institution_id', institutionId)
  if (periodDays > 0) {
    url.searchParams.set('period_days', String(periodDays))
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  })

  let body: DashboardSummaryResponse | null = null
  try {
    body = (await res.json()) as DashboardSummaryResponse
  } catch {
    body = null
  }

  if (!res.ok) {
    const message =
      body?.error?.trim() ||
      `Falha ao carregar métricas do dashboard (HTTP ${res.status}).`
    throw new Error(message)
  }

  // Sem o endpoint (ex.: Vite dev ou deploy antigo), o fallback de SPA devolve
  // 200 com index.html. Valida a forma da resposta para não tratar isso como
  // "sem dados".
  if (
    !body ||
    typeof body.students !== 'object' ||
    body.students === null ||
    !Array.isArray(body.trail_ids)
  ) {
    throw new Error(
      'Resposta inválida de /api/dashboard_summary (endpoint indisponível?).',
    )
  }

  const trailIds = body.trail_ids
  const doneByStudent = new Map<string, Set<string>>()
  const answerMap = new Map<string, string>()

  for (const [studentId, entry] of Object.entries(body?.students ?? {})) {
    const done = new Set<string>()
    for (const [compactKey, answer] of Object.entries(entry.answers ?? {})) {
      const key = expandKey(compactKey, trailIds)
      if (!key) continue
      done.add(key)
      answerMap.set(`${studentId}|${key}`, answer)
    }
    for (const compactKey of entry.extra_done ?? []) {
      const key = expandKey(compactKey, trailIds)
      if (!key) continue
      done.add(key)
    }
    if (done.size > 0) doneByStudent.set(studentId, done)
  }

  return {
    doneByStudent,
    answerMap,
    agentUsage: parseAgentUsage(body.agent_usage),
    agentUsagePresent:
      body.agent_usage != null && typeof body.agent_usage === 'object',
  }
}
