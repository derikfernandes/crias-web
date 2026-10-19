/**
 * Progresso do dashboard pela mesma fonte do Início: student_trails
 * (status + current_question_number) e exercise_attempts (acerto).
 */
import { doneActivities, pct } from './gestaoMetrics'
import type { ExerciseAttempt } from '../types/exerciseAttempt'
import type { StudentTrail } from '../types/studentTrail'

export type EngagementStatus = 'notStarted' | 'inProgress' | 'completed'

/** Atividade N concluída no vínculo (mesma regra do Início). */
export function isActivityDoneOnLink(
  link: StudentTrail,
  activityNumber: number,
  activityTotal: number,
): boolean {
  if (activityTotal <= 0 || activityNumber < 1) return false
  if (link.status === 'completed') return activityNumber <= activityTotal
  if (link.status === 'not_started') return false
  return link.current_question_number > activityNumber
}

export function engagementFromLinks(
  links: StudentTrail[],
  activityTotals?: Map<string, number>,
): EngagementStatus {
  if (links.length === 0) return 'notStarted'
  // 100% de atividades (mesmo critério do card Conclusão) conta como concluiu,
  // mesmo se o status no vínculo ainda estiver "in_progress".
  if (activityTotals && links.length > 0) {
    const allDone = links.every((l) => {
      const total = activityTotals.get(l.trail_id) ?? 0
      if (total <= 0) return l.status === 'completed'
      return doneActivities(l, total) >= total
    })
    if (allDone) return 'completed'
  }
  if (links.some((l) => l.status === 'in_progress')) return 'inProgress'
  if (links.some((l) => l.status === 'completed')) return 'completed'
  return 'notStarted'
}

/**
 * Quando as atividades filtradas cobrem 1..total da trilha, usa doneActivities
 * (idêntico ao Início). Com filtro parcial, conta só as atividades selecionadas.
 */
export function progressFromLinks(input: {
  links: StudentTrail[]
  /** Atividades (question_number) liberadas por trilha, já filtradas. */
  activitiesByTrail: Map<string, number[]>
  activityTotals: Map<string, number>
}): {
  released: number
  done: number
  completionPct: number | null
  lessonsReleased: number
  lessonsDone: number
  lessonsCompletionPct: number | null
} {
  let released = 0
  let done = 0

  for (const link of input.links) {
    const nums = input.activitiesByTrail.get(link.trail_id) ?? []
    const total = input.activityTotals.get(link.trail_id) ?? 0
    if (nums.length === 0 || total <= 0) continue

    const isFullSet =
      nums.length === total && nums.every((n, idx) => n === idx + 1)

    if (isFullSet) {
      released += total
      done += doneActivities(link, total)
      continue
    }

    released += nums.length
    for (const n of nums) {
      if (isActivityDoneOnLink(link, n, total)) done += 1
    }
  }

  return {
    released,
    done,
    completionPct: pct(done, released),
    lessonsReleased: released,
    lessonsDone: done,
    lessonsCompletionPct: pct(done, released),
  }
}

/**
 * Acerto por aluno: mesma fonte do card Início / Acerto médio.
 * Conta tentativas por student_id. `enrolledTrailIds` é opcional: se vazio,
 * conta todas as tentativas do aluno (como institutionMetrics no Início).
 */
export function accuracyFromAttempts(
  attempts: ExerciseAttempt[],
  studentId: string,
  enrolledTrailIds?: Set<string>,
): { correct: number; wrong: number; accuracyPct: number | null } {
  let correct = 0
  let wrong = 0
  const filterTrails = enrolledTrailIds != null && enrolledTrailIds.size > 0
  for (const a of attempts) {
    if (a.student_id !== studentId) continue
    if (filterTrails && a.trail_id && !enrolledTrailIds!.has(a.trail_id)) {
      continue
    }
    if (a.is_correct) correct += 1
    else wrong += 1
  }
  return {
    correct,
    wrong,
    accuracyPct: pct(correct, correct + wrong),
  }
}
