/**
 * Constantes e helpers de agentes no frontend (espelho de server/lib/agentUsage).
 * Mantido local para respeitar a fronteira design/pages ↔ api.
 */

export const CANONICAL_AGENT_TRAIL_IDS = [
  'Trilha - Matemática',
  'Trilha - Geral',
  'Trilha - Humanas',
  'Trilha - Natureza',
  'Tutor - Linguagens',
] as const

export const CANONICAL_AGENT_LABELS = [
  'Matemática',
  'Geral',
  'Humanas',
  'Natureza',
  'Linguagens',
] as const

export type AgentUsagePeriodDays = 0 | 7 | 30

export type AgentUsageStudentStatView = {
  studentId: string
  messages: number
  lastActivity: string | null
}

export type AgentUsageRowView = {
  trailId: string
  trailIds: string[]
  label: string
  messages: number
  uniqueStudents: number
  pctOfTotal: number
  lastActivity: string | null
  studentIds: string[]
  studentStats: AgentUsageStudentStatView[]
}

export type AgentUsageSeriesPointView = {
  date: string
  trailId: string
  messages: number
}

export type AgentUsageView = {
  periodDays: AgentUsagePeriodDays
  totalMessages: number
  agents: AgentUsageRowView[]
  series: AgentUsageSeriesPointView[]
}

export const EMPTY_AGENT_USAGE: AgentUsageView = {
  periodDays: 30,
  totalMessages: 0,
  agents: [],
  series: [],
}

export function agentLabelForTrailId(trailId: string): string {
  const id = trailId.trim()
  const canonical: Record<string, string> = {
    'Trilha - Matemática': 'Matemática',
    'Trilha - Geral': 'Geral',
    'Trilha - Humanas': 'Humanas',
    'Trilha - Natureza': 'Natureza',
    'Tutor - Linguagens': 'Linguagens',
  }
  if (id in canonical) return canonical[id]!
  if (id.startsWith('Trilha -')) return id.slice('Trilha -'.length).trim() || id
  if (id.startsWith('Tutor -')) return id.slice('Tutor -'.length).trim() || id
  return id
}

export function formatAgentLastActivity(iso: string | null): string {
  if (!iso) return '—'
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return '—'
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ms))
  } catch {
    return '—'
  }
}

/**
 * Deduplica por label fundindo aliases Trilha/Tutor.
 * Aliases são espelho (system vs student): usa max, não soma — senão o
 * KPI "Interações com tutores" dobra.
 */
export function mergeAgentRowsByLabel(
  rows: AgentUsageRowView[],
): AgentUsageRowView[] {
  const byLabel = new Map<string, AgentUsageRowView>()
  const canonicalPrimary: Record<string, string> = {
    Matemática: 'Trilha - Matemática',
    Geral: 'Trilha - Geral',
    Humanas: 'Trilha - Humanas',
    Natureza: 'Trilha - Natureza',
    Linguagens: 'Tutor - Linguagens',
  }

  for (const row of rows) {
    const label = row.label.trim() || agentLabelForTrailId(row.trailId)
    const existing = byLabel.get(label)
    if (!existing) {
      byLabel.set(label, {
        ...row,
        label,
        trailIds: [...new Set([...(row.trailIds ?? []), row.trailId])],
        studentStats: [...(row.studentStats ?? [])],
      })
      continue
    }

    const studentMap = new Map<
      string,
      { messages: number; lastActivity: string | null }
    >()
    for (const st of [...existing.studentStats, ...(row.studentStats ?? [])]) {
      const cur = studentMap.get(st.studentId)
      if (!cur) {
        studentMap.set(st.studentId, {
          messages: st.messages,
          lastActivity: st.lastActivity,
        })
        continue
      }
      // Espelho Trilha/Tutor: mesma conversa, não somar.
      cur.messages = Math.max(cur.messages, st.messages)
      if (
        st.lastActivity &&
        (!cur.lastActivity || st.lastActivity > cur.lastActivity)
      ) {
        cur.lastActivity = st.lastActivity
      }
    }
    // Se a API antiga só mandou studentIds, unir sem stats.
    for (const id of [...existing.studentIds, ...row.studentIds]) {
      if (!studentMap.has(id)) {
        studentMap.set(id, { messages: 0, lastActivity: null })
      }
    }

    const studentStats = [...studentMap.entries()]
      .map(([studentId, st]) => ({
        studentId,
        messages: st.messages,
        lastActivity: st.lastActivity,
      }))
      .sort((a, b) => {
        if (b.messages !== a.messages) return b.messages - a.messages
        return a.studentId.localeCompare(b.studentId)
      })

    const trailIds = [
      ...new Set([
        ...existing.trailIds,
        existing.trailId,
        ...row.trailIds,
        row.trailId,
      ]),
    ].sort((a, b) => a.localeCompare(b))

    const primary =
      canonicalPrimary[label] ??
      (trailIds.find((id) => CANONICAL_AGENT_TRAIL_IDS.includes(id as never)) ??
        existing.trailId)

    const lastActivity =
      existing.lastActivity && row.lastActivity
        ? existing.lastActivity > row.lastActivity
          ? existing.lastActivity
          : row.lastActivity
        : existing.lastActivity ?? row.lastActivity

    byLabel.set(label, {
      trailId: primary,
      trailIds,
      label,
      // Espelho Trilha/Tutor: fica o maior volume do par, não a soma.
      messages: Math.max(existing.messages, row.messages),
      uniqueStudents: studentStats.length,
      pctOfTotal: 0,
      lastActivity,
      studentIds: studentStats.map((s) => s.studentId),
      studentStats,
    })
  }

  const total = [...byLabel.values()].reduce((s, r) => s + r.messages, 0)
  const ordered: AgentUsageRowView[] = []
  const seen = new Set<string>()
  for (const label of CANONICAL_AGENT_LABELS) {
    const row = byLabel.get(label)
    if (!row) continue
    seen.add(label)
    ordered.push({
      ...row,
      pctOfTotal:
        total > 0 ? Math.round((row.messages / total) * 1000) / 10 : 0,
    })
  }
  for (const [label, row] of [...byLabel.entries()].sort((a, b) => {
    if (b[1].messages !== a[1].messages) return b[1].messages - a[1].messages
    return a[0].localeCompare(b[0])
  })) {
    if (seen.has(label)) continue
    ordered.push({
      ...row,
      pctOfTotal:
        total > 0 ? Math.round((row.messages / total) * 1000) / 10 : 0,
    })
  }
  return ordered
}

export function messagesPerTutorPerDay(input: {
  totalMessages: number
  activeTutorCount: number
  periodDays: number
  activeDayCount: number
}): number {
  const tutors = Math.max(0, input.activeTutorCount)
  if (input.totalMessages <= 0 || tutors <= 0) return 0
  const days =
    input.periodDays > 0
      ? input.periodDays
      : Math.max(1, input.activeDayCount)
  return Math.round((input.totalMessages / tutors / days) * 10) / 10
}
