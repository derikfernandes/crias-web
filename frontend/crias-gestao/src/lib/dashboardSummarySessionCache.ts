/**
 * Cache de sessão do dashboard_summary por instituição.
 * Separado do period_days do monitor: answerMap é reutilizado;
 * agent_usage por período troca sem refetch completo quando o
 * servidor devolve agent_usage_by_period.
 */
import type { AgentUsagePeriodDays, AgentUsageView } from './agentUsage'
import { EMPTY_AGENT_USAGE } from './agentUsage'
import type { DashboardLogSummary } from './dashboardSummaryApi'

export type InstitutionSummarySession = {
  doneByStudent: Map<string, Set<string>>
  answerMap: Map<string, string>
  agentUsageByPeriod: Partial<Record<AgentUsagePeriodDays, AgentUsageView>>
  agentUsagePresent: boolean
  loadedAt: number
}

const session = new Map<string, InstitutionSummarySession>()

export function getSummarySession(
  institutionId: string,
): InstitutionSummarySession | undefined {
  return session.get(institutionId)
}

export function setSummarySession(
  institutionId: string,
  summary: DashboardLogSummary,
  periodDays: AgentUsagePeriodDays,
  byPeriod?: Partial<Record<AgentUsagePeriodDays, AgentUsageView>>,
): void {
  const prev = session.get(institutionId)
  // Inclui agentUsageByPeriod do summary (servidor manda 0/7/30 numa tacada).
  const agentUsageByPeriod: Partial<
    Record<AgentUsagePeriodDays, AgentUsageView>
  > = {
    ...(prev?.agentUsageByPeriod ?? {}),
    ...(summary.agentUsageByPeriod ?? {}),
    ...(byPeriod ?? {}),
    [periodDays]: summary.agentUsage,
  }
  session.set(institutionId, {
    doneByStudent: summary.doneByStudent,
    answerMap: summary.answerMap,
    agentUsageByPeriod,
    agentUsagePresent: summary.agentUsagePresent,
    loadedAt: Date.now(),
  })
}

export function agentUsageForPeriod(
  institutionId: string,
  periodDays: AgentUsagePeriodDays,
): AgentUsageView | undefined {
  return session.get(institutionId)?.agentUsageByPeriod[periodDays]
}

export function mergeSessionAnswerMaps(ids: string[]): {
  answerMap: Map<string, string>
  doneByStudent: Map<string, Set<string>>
  readyIds: string[]
  missingIds: string[]
} {
  const answerMap = new Map<string, string>()
  const doneByStudent = new Map<string, Set<string>>()
  const readyIds: string[] = []
  const missingIds: string[] = []
  for (const id of ids) {
    const s = session.get(id)
    if (!s) {
      missingIds.push(id)
      continue
    }
    readyIds.push(id)
    for (const [k, v] of s.answerMap) answerMap.set(k, v)
    for (const [sid, keys] of s.doneByStudent) {
      const set = doneByStudent.get(sid) ?? new Set<string>()
      for (const k of keys) set.add(k)
      doneByStudent.set(sid, set)
    }
  }
  return { answerMap, doneByStudent, readyIds, missingIds }
}

export function mergeSessionAgentUsage(
  ids: string[],
  periodDays: AgentUsagePeriodDays,
): { usage: AgentUsageView; present: boolean; complete: boolean } {
  let totalMessages = 0
  let present = false
  const agents: AgentUsageView['agents'] = []
  for (const id of ids) {
    const u = agentUsageForPeriod(id, periodDays)
    if (!u) {
      return {
        usage: { ...EMPTY_AGENT_USAGE, periodDays },
        present: false,
        complete: false,
      }
    }
    present = true
    totalMessages += u.totalMessages
    agents.push(...u.agents)
  }
  return {
    usage: {
      periodDays,
      totalMessages,
      agents,
      series: [],
    },
    present,
    complete: ids.length > 0,
  }
}

/** Só testes. */
export function clearSummarySessionCache(): void {
  session.clear()
}
