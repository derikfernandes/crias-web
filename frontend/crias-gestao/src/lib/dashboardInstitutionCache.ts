/**
 * Cache em memória por institution_id para o Dashboard.
 * Troca de filtro reutiliza o snapshot e evita BootSymbol / refetch completo.
 */
import type { ExerciseAttempt } from '../types/exerciseAttempt'
import type { Student } from '../types/student'
import type { StudentTrail } from '../types/studentTrail'
import type { Trail } from '../types/trail'
import type { TrailStage } from '../types/trailStage'
import type { TrailStageQuestion } from '../types/trailStageQuestion'
import type { AgentUsageView } from './agentUsage'

export type DashboardInstitutionSnapshot = {
  students: Student[]
  trails: Trail[]
  studentTrails: StudentTrail[]
  attempts: ExerciseAttempt[]
  stages: TrailStage[]
  questions: TrailStageQuestion[]
  doneByStudent: Map<string, Set<string>>
  answerMap: Map<string, string>
  agentUsage: AgentUsageView
  agentUsagePresent: boolean
  loadedAt: number
}

const cache = new Map<string, DashboardInstitutionSnapshot>()

export function getCachedInstitution(
  id: string,
): DashboardInstitutionSnapshot | undefined {
  return cache.get(id)
}

export function setCachedInstitution(
  id: string,
  snap: DashboardInstitutionSnapshot,
): void {
  cache.set(id, snap)
}

export function mergeCachedInstitutions(
  ids: string[],
): DashboardInstitutionSnapshot | null {
  const parts = ids
    .map((id) => cache.get(id))
    .filter((s): s is DashboardInstitutionSnapshot => Boolean(s))
  if (parts.length === 0 || parts.length !== ids.length) return null

  const students = parts.flatMap((p) => p.students)
  const trails = parts.flatMap((p) => p.trails)
  const studentTrails = parts.flatMap((p) => p.studentTrails)
  const attempts = parts.flatMap((p) => p.attempts)
  const stages = parts.flatMap((p) => p.stages)
  const questions = parts.flatMap((p) => p.questions)
  const doneByStudent = new Map<string, Set<string>>()
  const answerMap = new Map<string, string>()
  let totalMessages = 0
  let agentUsagePresent = false
  const agentRows = []
  for (const p of parts) {
    agentUsagePresent = agentUsagePresent || p.agentUsagePresent
    totalMessages += p.agentUsage.totalMessages
    agentRows.push(...p.agentUsage.agents)
    for (const [sid, keys] of p.doneByStudent) {
      const set = doneByStudent.get(sid) ?? new Set<string>()
      for (const k of keys) set.add(k)
      doneByStudent.set(sid, set)
    }
    for (const [k, v] of p.answerMap) answerMap.set(k, v)
  }

  return {
    students,
    trails,
    studentTrails,
    attempts,
    stages,
    questions,
    doneByStudent,
    answerMap,
    agentUsage: {
      periodDays: parts[0]?.agentUsage.periodDays ?? 0,
      totalMessages,
      agents: agentRows,
      series: [],
    },
    agentUsagePresent,
    loadedAt: Math.min(...parts.map((p) => p.loadedAt)),
  }
}

/** Só testes. */
export function clearDashboardInstitutionCache(): void {
  cache.clear()
}
