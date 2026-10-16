import type { ExerciseAttempt } from '../types/exerciseAttempt'
import type { Student } from '../types/student'
import type { StudentTrail } from '../types/studentTrail'
import type { Trail } from '../types/trail'
import type { TrailStageQuestion } from '../types/trailStageQuestion'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export type InstitutionMetrics = {
  activeStudents: number
  activeTrails: number
  /** Alunos com atividade nos últimos 7 dias. */
  activeLast7Days: number
  inProgress: number
  completed: number
  notStarted: number
  /** 0 a 100, ou null quando não há base de cálculo ("N/A"). */
  avgCompletion: number | null
  avgAccuracy: number | null
}

export function pct(num: number, den: number): number | null {
  if (den <= 0) return null
  return Math.round((num / den) * 1000) / 10
}

/** Número de atividades (question_number) de cada trilha. */
export function activityCountByTrail(
  questions: TrailStageQuestion[],
): Map<string, number> {
  const seen = new Map<string, Set<number>>()
  for (const q of questions) {
    if (!q.active) continue
    const set = seen.get(q.trail_id) ?? new Set<number>()
    set.add(q.question_number)
    seen.set(q.trail_id, set)
  }
  const out = new Map<string, number>()
  for (const [id, set] of seen) out.set(id, set.size)
  return out
}

/** Atividades concluídas de um vínculo aluno-trilha (a atual ainda está em andamento). */
export function doneActivities(link: StudentTrail, total: number): number {
  if (link.status === 'completed') return total
  if (link.status === 'not_started') return 0
  return Math.max(0, Math.min(total, link.current_question_number - 1))
}

/**
 * Resumo de uma instituição para o Início da Gestão.
 * Conclusão: atividades feitas sobre atividades dos vínculos dos alunos ativos.
 * Acerto: tentativas certas sobre tentativas de exercício dos alunos ativos.
 */
export function institutionMetrics(input: {
  institutionId: string
  students: Student[]
  trails: Trail[]
  studentTrails: StudentTrail[]
  activityTotals: Map<string, number>
  attempts: ExerciseAttempt[]
  now?: number
}): InstitutionMetrics {
  const now = input.now ?? Date.now()
  const students = input.students.filter(
    (s) => s.institution_id === input.institutionId,
  )
  const active = students.filter((s) => s.active)
  const activeIds = new Set(active.map((s) => s.id))
  const trails = input.trails.filter(
    (t) => t.institution_id === input.institutionId,
  )
  const links = input.studentTrails.filter(
    (st) => st.institution_id === input.institutionId,
  )

  const inProgress = new Set<string>()
  const completed = new Set<string>()
  const recent = new Set<string>()
  let notStarted = 0
  let done = 0
  let total = 0
  for (const link of links) {
    if (link.status === 'in_progress') inProgress.add(link.student_id)
    if (link.status === 'completed') completed.add(link.student_id)
    if (link.status === 'not_started') notStarted += 1
    const last = link.last_interaction_at?.toMillis?.() ?? 0
    if (last > 0 && now - last <= SEVEN_DAYS_MS) recent.add(link.student_id)
    if (!activeIds.has(link.student_id)) continue
    const count = input.activityTotals.get(link.trail_id) ?? 0
    done += doneActivities(link, count)
    total += count
  }

  let correct = 0
  let tried = 0
  for (const a of input.attempts) {
    if (a.institution_id !== input.institutionId) continue
    if (!activeIds.has(a.student_id)) continue
    tried += 1
    if (a.is_correct) correct += 1
  }

  return {
    activeStudents: active.length,
    activeTrails: trails.filter((t) => t.active).length,
    activeLast7Days: recent.size,
    inProgress: inProgress.size,
    completed: completed.size,
    notStarted,
    avgCompletion: pct(done, total),
    avgAccuracy: pct(correct, tried),
  }
}

export function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A'
  return `${String(value).replace('.', ',')} %`
}
