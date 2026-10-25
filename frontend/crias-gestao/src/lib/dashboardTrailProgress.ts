/**
 * Progresso do dashboard pela mesma fonte do Início: student_trails
 * (current_stage_number + current_question_number) e exercise_attempts.
 */
import { isNonGradableAnswer } from './acertoMedio'
import {
  doneActivities,
  isActivityKeyDoneOnLink,
  pct,
  type ActivityKey,
} from './gestaoMetrics'
import type { ExerciseAttempt } from '../types/exerciseAttempt'
import type { StudentTrail } from '../types/studentTrail'

export type EngagementStatus = 'notStarted' | 'inProgress' | 'completed'

/** @deprecated Prefer isActivityKeyDoneOnLink com catálogo (stage, question). */
export function isActivityDoneOnLink(
  link: StudentTrail,
  activityNumber: number,
  activityTotal: number,
): boolean {
  if (activityTotal <= 0 || activityNumber < 1) return false
  if (link.status === 'not_started') return false
  // Legado 1 etapa: concluída se current_question > N.
  return link.current_question_number > activityNumber
}

export function engagementFromLinks(
  links: StudentTrail[],
  activityTotals?: Map<string, number>,
  activityCatalogs?: Map<string, ActivityKey[]>,
): EngagementStatus {
  if (links.length === 0) return 'notStarted'

  // Concluiu = 100% de progresso real no catálogo (não só status completed).
  if (activityCatalogs || activityTotals) {
    const allDone = links.every((l) => {
      const catalog = activityCatalogs?.get(l.trail_id)
      const total = catalog?.length ?? activityTotals?.get(l.trail_id) ?? 0
      if (total <= 0) return false
      const done = catalog
        ? doneActivities(l, catalog)
        : doneActivities(l, total)
      return done >= total
    })
    if (allDone) return 'completed'
  }

  if (
    links.some(
      (l) => l.status === 'in_progress' || l.status === 'completed',
    )
  ) {
    return 'inProgress'
  }
  return 'notStarted'
}

/**
 * Progresso pelas atividades liberadas. Com catálogo (stage, question) usa
 * a mesma regra do Início. Sem catálogo, cai no total numérico legado.
 */
export function progressFromLinks(input: {
  links: StudentTrail[]
  /** Atividades (question_number) liberadas por trilha — legado 1 etapa. */
  activitiesByTrail: Map<string, number[]>
  activityTotals: Map<string, number>
  /** Catálogo completo (stage, question) por trilha. */
  activityCatalogs?: Map<string, ActivityKey[]>
  /** Subconjunto filtrado (stage, question) por trilha. */
  activityKeysByTrail?: Map<string, ActivityKey[]>
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
    const catalog = input.activityCatalogs?.get(link.trail_id)
    const filteredKeys = input.activityKeysByTrail?.get(link.trail_id)
    const total = catalog?.length ?? input.activityTotals.get(link.trail_id) ?? 0

    if (catalog && catalog.length > 0) {
      const keys =
        filteredKeys && filteredKeys.length > 0 ? filteredKeys : catalog
      const isFullSet =
        keys.length === catalog.length &&
        keys.every(
          (k, i) =>
            k.stage === catalog[i].stage && k.question === catalog[i].question,
        )

      if (isFullSet) {
        released += catalog.length
        done += doneActivities(link, catalog)
        continue
      }

      released += keys.length
      for (const k of keys) {
        if (isActivityKeyDoneOnLink(link, k, catalog)) done += 1
      }
      continue
    }

    // Legado: só question_number.
    const nums = input.activitiesByTrail.get(link.trail_id) ?? []
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
 * Conta tentativas por student_id. `enrolledTrailIds` é opcional.
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
    // Ignora chaves fora de faixa (stage/question < 1).
    if (
      (a.stage_number != null && a.stage_number < 1) ||
      (a.question_number != null && a.question_number < 1)
    ) {
      continue
    }
    // Continuar / "0": fora do acerto (mesma regra do Início/Dados).
    if (isNonGradableAnswer(a.student_answer ?? '')) continue
    // Sem gabarito (score null): fora do denominador.
    if (a.score === null || a.score === undefined) {
      if (!(a.correct_option ?? '').trim()) continue
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
