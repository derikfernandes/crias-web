/**
 * Classificação e agregação de uso dos agentes de IA (Chatis).
 * Fonte de verdade alinhada a specs/10_AGENT_USAGE_DASHBOARD.md.
 *
 * Agrega por **disciplina** (label): aliases `Trilha - X` + `Tutor - X`
 * viram uma única linha. Volume = **max** dos aliases (espelho system/student),
 * não a soma — evita dobrar interações.
 */

export const CANONICAL_AGENT_TRAIL_IDS = [
  'Trilha - Matemática',
  'Trilha - Geral',
  'Trilha - Humanas',
  'Trilha - Natureza',
  'Tutor - Linguagens',
] as const

export type CanonicalAgentTrailId = (typeof CANONICAL_AGENT_TRAIL_IDS)[number]

const CANONICAL_LABELS: Record<CanonicalAgentTrailId, string> = {
  'Trilha - Matemática': 'Matemática',
  'Trilha - Geral': 'Geral',
  'Trilha - Humanas': 'Humanas',
  'Trilha - Natureza': 'Natureza',
  'Tutor - Linguagens': 'Linguagens',
}

/** Ordem de exibição das disciplinas canônicas. */
export const CANONICAL_AGENT_LABELS = [
  'Matemática',
  'Geral',
  'Humanas',
  'Natureza',
  'Linguagens',
] as const

const CANONICAL_SET = new Set<string>(CANONICAL_AGENT_TRAIL_IDS)

/** Preferência de primary trail_id por label (allowlist). */
const PRIMARY_BY_LABEL: Record<string, string> = {
  Matemática: 'Trilha - Matemática',
  Geral: 'Trilha - Geral',
  Humanas: 'Trilha - Humanas',
  Natureza: 'Trilha - Natureza',
  Linguagens: 'Tutor - Linguagens',
}

export function isAgentTrailId(trailId: string): boolean {
  const id = trailId.trim()
  if (!id) return false
  if (CANONICAL_SET.has(id)) return true
  return id.startsWith('Trilha -') || id.startsWith('Tutor -')
}

export function agentLabelForTrailId(trailId: string): string {
  const id = trailId.trim()
  if (id in CANONICAL_LABELS) {
    return CANONICAL_LABELS[id as CanonicalAgentTrailId]
  }
  if (id.startsWith('Trilha -')) return id.slice('Trilha -'.length).trim() || id
  if (id.startsWith('Tutor -')) return id.slice('Tutor -'.length).trim() || id
  return id
}

export type AgentUsageLogInput = {
  student_id: string
  trail_id: string
  at: number
}

export type AgentUsageStudentStat = {
  student_id: string
  messages: number
  last_activity: string | null
}

export type AgentUsageRow = {
  /** Primary trail_id (preferência allowlist). */
  trail_id: string
  /** Todos os aliases Firestore que alimentaram esta disciplina. */
  trail_ids: string[]
  label: string
  messages: number
  unique_students: number
  pct_of_total: number
  last_activity: string | null
  student_ids: string[]
  /** Ranking por volume (desc) para drill-down. */
  student_stats: AgentUsageStudentStat[]
}

export type AgentUsageSeriesPoint = {
  date: string
  /** Primary trail_id da disciplina agregada. */
  trail_id: string
  messages: number
}

export type AgentUsageAggregate = {
  period_days: number
  total_messages: number
  agents: AgentUsageRow[]
  series: AgentUsageSeriesPoint[]
}

function pctOfTotal(messages: number, total: number): number {
  if (total <= 0 || messages <= 0) return 0
  return Math.round((messages / total) * 1000) / 10
}

function toIsoOrNull(ms: number): string | null {
  if (!ms || ms <= 0) return null
  try {
    return new Date(ms).toISOString()
  } catch {
    return null
  }
}

/** Data civil America/Sao_Paulo a partir de epoch ms. */
export function brasiliaDateKey(ms: number): string {
  if (!ms || ms <= 0) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(ms))
  const map: Record<string, string> = {}
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value
  }
  const y = map.year
  const m = map.month
  const d = map.day
  if (!y || !m || !d) return ''
  return `${y}-${m}-${d}`
}

function preferPrimaryTrailId(a: string, b: string): string {
  const ia = CANONICAL_AGENT_TRAIL_IDS.indexOf(a as CanonicalAgentTrailId)
  const ib = CANONICAL_AGENT_TRAIL_IDS.indexOf(b as CanonicalAgentTrailId)
  if (ia >= 0 && ib >= 0) return ia <= ib ? a : b
  if (ia >= 0) return a
  if (ib >= 0) return b
  return a.localeCompare(b) <= 0 ? a : b
}

type LabelBucket = {
  /** Contagem por alias (`Trilha - X` / `Tutor - X`). */
  messagesByTrail: Map<string, number>
  lastAt: number
  trailIds: Set<string>
  primary: string
  /** studentId → alias → contagem (espelho: usa max na saída). */
  students: Map<
    string,
    { byTrail: Map<string, number>; lastAt: number }
  >
}

export function aggregateAgentUsage(
  logs: AgentUsageLogInput[],
  periodDays: number = 0,
): AgentUsageAggregate {
  const byLabel = new Map<string, LabelBucket>()
  /** Série por dia → alias → count; depois max por disciplina. */
  const seriesByDayAlias = new Map<string, Map<string, number>>()

  for (const log of logs) {
    const trailId = typeof log.trail_id === 'string' ? log.trail_id.trim() : ''
    if (!isAgentTrailId(trailId)) continue

    const label = agentLabelForTrailId(trailId)

    let bucket = byLabel.get(label)
    if (!bucket) {
      bucket = {
        messagesByTrail: new Map(),
        lastAt: 0,
        trailIds: new Set(),
        primary: PRIMARY_BY_LABEL[label] ?? trailId,
        students: new Map(),
      }
      byLabel.set(label, bucket)
    }

    bucket.messagesByTrail.set(
      trailId,
      (bucket.messagesByTrail.get(trailId) ?? 0) + 1,
    )
    bucket.trailIds.add(trailId)
    if (CANONICAL_SET.has(trailId) || !CANONICAL_SET.has(bucket.primary)) {
      bucket.primary = preferPrimaryTrailId(bucket.primary, trailId)
    }
    if (PRIMARY_BY_LABEL[label]) {
      bucket.primary = PRIMARY_BY_LABEL[label]!
    }
    if (log.at > bucket.lastAt) bucket.lastAt = log.at

    const sid = log.student_id?.trim()
    if (sid) {
      let st = bucket.students.get(sid)
      if (!st) {
        st = { byTrail: new Map(), lastAt: 0 }
        bucket.students.set(sid, st)
      }
      st.byTrail.set(trailId, (st.byTrail.get(trailId) ?? 0) + 1)
      if (log.at > st.lastAt) st.lastAt = log.at
    }

    const day = brasiliaDateKey(log.at)
    if (day) {
      const primary = PRIMARY_BY_LABEL[label] ?? bucket.primary
      const seriesKey = `${day}\0${primary}`
      let byAlias = seriesByDayAlias.get(seriesKey)
      if (!byAlias) {
        byAlias = new Map()
        seriesByDayAlias.set(seriesKey, byAlias)
      }
      byAlias.set(trailId, (byAlias.get(trailId) ?? 0) + 1)
    }
  }

  /** Volume = max dos aliases (espelho Trilha/Tutor), não a soma. */
  const maxMapValues = (m: Map<string, number> | undefined): number => {
    if (!m || m.size === 0) return 0
    return Math.max(...m.values())
  }

  let totalMessages = 0
  for (const bucket of byLabel.values()) {
    totalMessages += maxMapValues(bucket.messagesByTrail)
  }

  const agents: AgentUsageRow[] = []
  const seenLabels = new Set<string>()

  const pushRow = (label: string, bucket: LabelBucket | undefined) => {
    seenLabels.add(label)
    const primary =
      PRIMARY_BY_LABEL[label] ??
      bucket?.primary ??
      `Trilha - ${label}`
    const trailIds = bucket
      ? [...bucket.trailIds].sort((a, b) => a.localeCompare(b))
      : [primary]
    if (!trailIds.includes(primary)) trailIds.unshift(primary)

    const messages = maxMapValues(bucket?.messagesByTrail)

    const studentStats = bucket
      ? [...bucket.students.entries()]
          .map(([student_id, st]) => ({
            student_id,
            messages: maxMapValues(st.byTrail),
            last_activity: toIsoOrNull(st.lastAt),
          }))
          .sort((a, b) => {
            if (b.messages !== a.messages) return b.messages - a.messages
            return a.student_id.localeCompare(b.student_id)
          })
      : []

    const studentIds = studentStats.map((s) => s.student_id)

    agents.push({
      trail_id: primary,
      trail_ids: trailIds,
      label,
      messages,
      unique_students: studentIds.length,
      pct_of_total: pctOfTotal(messages, totalMessages),
      last_activity: toIsoOrNull(bucket?.lastAt ?? 0),
      student_ids: studentIds,
      student_stats: studentStats,
    })
  }

  for (const label of CANONICAL_AGENT_LABELS) {
    pushRow(label, byLabel.get(label))
  }

  const extraLabels = [...byLabel.keys()]
    .filter((label) => !seenLabels.has(label))
    .sort((a, b) => {
      const mb = maxMapValues(byLabel.get(b)?.messagesByTrail)
      const ma = maxMapValues(byLabel.get(a)?.messagesByTrail)
      if (mb !== ma) return mb - ma
      return a.localeCompare(b)
    })

  for (const label of extraLabels) {
    pushRow(label, byLabel.get(label))
  }

  const series: AgentUsageSeriesPoint[] = [...seriesByDayAlias.entries()]
    .map(([key, byAlias]) => {
      const sep = key.indexOf('\0')
      return {
        date: key.slice(0, sep),
        trail_id: key.slice(sep + 1),
        messages: maxMapValues(byAlias),
      }
    })
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return a.trail_id.localeCompare(b.trail_id)
    })

  return {
    period_days: periodDays,
    total_messages: totalMessages,
    agents,
    series,
  }
}

export function parsePeriodDays(raw: string | null | undefined): number {
  if (raw == null || raw.trim() === '') return 0
  const n = Number(raw)
  if (n === 7 || n === 30) return n
  return 0
}

/** Epoch mínimo inclusivo para o filtro de período (agora − N dias). */
export function periodCutoffMillis(
  periodDays: number,
  nowMs: number = Date.now(),
): number {
  if (periodDays <= 0) return 0
  return nowMs - periodDays * 24 * 60 * 60 * 1000
}

/**
 * Média de mensagens por tutor ativo por dia no período.
 * Com periodDays=0, usa dias com atividade na série como denominador.
 */
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
