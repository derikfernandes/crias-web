/**
 * Pré-agregação server-side dos números de Início + Dados.
 * O client só lê este payload (~KB); nunca reconstrói 57k respostas.
 */

import { isUiCommandText } from './studentFieldValidation'
import type { AgentUsageAggregate } from './agentUsage'

export type MetricsPill = {
  key: string
  trail_id: string
  trail_name: string
  stage_number: number
  question_number: number
  title: string
  gabarito: string
  total: number
  correct: number
  wrong: number
  accuracy_pct: number
}

export type MetricsStageBar = {
  key: string
  trail_id: string
  trail_name: string
  stage_number: number
  label: string
  count: number
  enrolled_count: number
}

export type MetricsStudentRow = {
  id: string
  name: string
  active: boolean
  done: number
  released: number
  lessons_done: number
  lessons_released: number
  correct: number
  wrong: number
  accuracy_pct: number | null
}

export type InstitutionDashboardMetrics = {
  institution_id: string
  computed_at: number
  active_students: number
  active_trails: number
  avg_completion: number | null
  avg_lesson_completion: number | null
  avg_accuracy: number | null
  accuracy_correct: number
  accuracy_tried: number
  /** Respostas em células anuladas que NÃO entraram no denominador. */
  annulled_answers_excluded: number
  exercise_count: number
  worst_pills: MetricsPill[]
  best_pills: MetricsPill[]
  /** Ranking completo de exercícios (Dados aba Exercícios). */
  exercise_pills: MetricsPill[]
  stage_bars: MetricsStageBar[]
  students: MetricsStudentRow[]
  agent_usage_by_period: Record<'0' | '7' | '30', AgentUsageAggregate>
}

function normalizeAnswer(value: string): string {
  let s = value.trim()
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim()
  }
  return s
}

function isNonGradable(raw: string): boolean {
  const s = normalizeAnswer(raw)
  if (!s) return true
  const lower = s.toLowerCase()
  if (lower === '0' || lower === 'continuar' || lower === 'continuar.') {
    return true
  }
  return isUiCommandText(s)
}

function answersMatch(studentAnswer: string, correctOption: string): boolean {
  const a = normalizeAnswer(studentAnswer).toLowerCase()
  const g = normalizeAnswer(correctOption).toLowerCase()
  return Boolean(a && g && a === g)
}

/**
 * Texto longo / enunciado colado contra gabarito de alternativa (A–D ou 1–4):
 * fora do denominador. (dígito↔letra cruzados em t67 ficam como wrong —
 * excluí-los derrubava tried abaixo de 56863 e subia % p/ 70,4%.)
 */
function isNonOptionAgainstGabarito(
  studentAnswer: string,
  correctOption: string,
): boolean {
  const a = normalizeAnswer(studentAnswer)
  const g = normalizeAnswer(correctOption)
  if (!a || !g) return true
  const gIsOption = /^[a-d]$/i.test(g) || /^[1-4]$/.test(g)
  if (!gIsOption) return false
  const aIsOption = /^[a-d]$/i.test(a) || /^[1-4]$/.test(a)
  return !aIsOption
}

function pct(n: number, d: number): number | null {
  if (d <= 0) return null
  return Math.round((n / d) * 1000) / 10
}

export type MetricsQuestion = {
  trail_id: string
  stage_number: number
  question_number: number
  title?: string
  correct_option?: string
  annulled?: boolean
  /** Se presente, trata como anulada mesmo sem flag boolean. */
  annulled_at?: unknown
  active?: boolean
}

export type MetricsStage = {
  trail_id: string
  stage_number: number
  stage_type?: string
  title?: string
}

export type MetricsTrail = {
  id: string
  name?: string
  active?: boolean
}

export type MetricsStudent = {
  id: string
  name?: string
  active?: boolean
}

export type MetricsStudentTrail = {
  student_id: string
  trail_id: string
  status?: string
}

export type CompactStudentEntry = {
  answers: Record<string, string>
  extra_done: string[]
}

/**
 * Calcula o doc de métricas a partir do mapa compacto de answers + catálogo.
 * `trail_ids` é o índice usado nas chaves compactas "trailIdx|stage|question".
 */
export function computeInstitutionDashboardMetrics(input: {
  institutionId: string
  trailIds: string[]
  studentsMap: Record<string, CompactStudentEntry>
  students: MetricsStudent[]
  trails: MetricsTrail[]
  studentTrails: MetricsStudentTrail[]
  questions: MetricsQuestion[]
  stages: MetricsStage[]
  agentUsageByPeriod: Record<'0' | '7' | '30', AgentUsageAggregate>
  nowMs?: number
}): InstitutionDashboardMetrics {
  const now = input.nowMs ?? Date.now()
  const trailIdList = input.trailIds
  const trailById = new Map(input.trails.map((t) => [t.id, t]))
  const activeTrails = input.trails.filter((t) => t.active !== false)
  const activeStudents = input.students.filter((s) => s.active !== false)
  const activeIds = new Set(activeStudents.map((s) => s.id))

  const gabarito = new Map<string, string>()
  const annulled = new Set<string>()
  const titleByKey = new Map<string, string>()
  for (const q of input.questions) {
    if (q.active === false) continue
    const key = `${q.trail_id}|${q.stage_number}|${q.question_number}`
    const isAnnulled = q.annulled === true || q.annulled_at != null
    if (isAnnulled) {
      annulled.add(key)
      continue
    }
    const g = (q.correct_option ?? '').trim()
    if (!g) continue
    gabarito.set(key, g)
    titleByKey.set(key, (q.title ?? '').trim() || key)
  }

  // activity catalog por trilha (para conclusão)
  const activityByTrail = new Map<string, Set<string>>()
  const lessonByTrail = new Map<string, Set<number>>()
  for (const q of input.questions) {
    if (q.active === false) continue
    const set = activityByTrail.get(q.trail_id) ?? new Set()
    set.add(`${q.stage_number}|${q.question_number}`)
    activityByTrail.set(q.trail_id, set)
    const lessons = lessonByTrail.get(q.trail_id) ?? new Set()
    lessons.add(q.stage_number)
    lessonByTrail.set(q.trail_id, lessons)
  }

  const exerciseStagesByTrail = new Map<string, Set<number>>()
  for (const st of input.stages) {
    if (st.stage_type && st.stage_type !== 'exercise') continue
    const set = exerciseStagesByTrail.get(st.trail_id) ?? new Set()
    set.add(st.stage_number)
    exerciseStagesByTrail.set(st.trail_id, set)
  }

  const linksByStudent = new Map<string, MetricsStudentTrail[]>()
  for (const link of input.studentTrails) {
    const list = linksByStudent.get(link.student_id) ?? []
    list.push(link)
    linksByStudent.set(link.student_id, list)
  }

  let doneTotal = 0
  let releasedTotal = 0
  let lessonsDoneTotal = 0
  let lessonsReleasedTotal = 0
  let annulledAnswersExcluded = 0

  const pillAgg = new Map<
    string,
    { correct: number; wrong: number; trailId: string; stage: number; q: number }
  >()
  const perStudent = new Map<
    string,
    { correct: number; wrong: number; done: number; released: number; lessonsDone: number; lessonsReleased: number }
  >()

  for (const student of activeStudents) {
    const links = linksByStudent.get(student.id) ?? []
    let done = 0
    let released = 0
    let lessonsDone = 0
    let lessonsReleased = 0
    for (const link of links) {
      const trail = trailById.get(link.trail_id)
      if (!trail || trail.active === false) continue
      const catalog = activityByTrail.get(link.trail_id) ?? new Set()
      released += catalog.size
      const lessons = lessonByTrail.get(link.trail_id) ?? new Set()
      lessonsReleased += lessons.size
    }

    const entry = input.studentsMap[student.id]
    const doneKeys = new Set<string>()
    if (entry) {
      for (const compact of Object.keys(entry.answers ?? {})) {
        const expanded = expandCompact(compact, trailIdList)
        if (expanded) doneKeys.add(expanded)
      }
      for (const compact of entry.extra_done ?? []) {
        const expanded = expandCompact(compact, trailIdList)
        if (expanded) doneKeys.add(expanded)
      }
    }

    for (const link of links) {
      const trail = trailById.get(link.trail_id)
      if (!trail || trail.active === false) continue
      const catalog = activityByTrail.get(link.trail_id) ?? new Set()
      let trailDone = 0
      const stagesDone = new Set<number>()
      for (const cell of catalog) {
        const [stageStr] = cell.split('|')
        const full = `${link.trail_id}|${cell}`
        if (doneKeys.has(full)) {
          trailDone += 1
          stagesDone.add(Number(stageStr))
        }
      }
      done += trailDone
      lessonsDone += stagesDone.size
    }

    doneTotal += done
    releasedTotal += released
    lessonsDoneTotal += lessonsDone
    lessonsReleasedTotal += lessonsReleased

    let correct = 0
    let wrong = 0
    if (entry) {
      for (const [compact, answer] of Object.entries(entry.answers ?? {})) {
        if (isNonGradable(answer)) continue
        const expanded = expandCompact(compact, trailIdList)
        if (!expanded) continue
        if (annulled.has(expanded)) {
          annulledAnswersExcluded += 1
          continue
        }
        const g = gabarito.get(expanded)
        if (!g) continue
        // Chat / texto de alternativa colado: não entra no denominador.
        if (isNonOptionAgainstGabarito(answer, g)) continue
        const [trailId, stageStr, qStr] = expanded.split('|')
        const stage = Number(stageStr)
        const qn = Number(qStr)
        // só trilhas da instituição (trailIds)
        if (!trailById.has(trailId)) continue
        const ok = answersMatch(answer, g)
        if (ok) correct += 1
        else wrong += 1

        let agg = pillAgg.get(expanded)
        if (!agg) {
          agg = {
            correct: 0,
            wrong: 0,
            trailId,
            stage,
            q: qn,
          }
          pillAgg.set(expanded, agg)
        }
        if (ok) agg.correct += 1
        else agg.wrong += 1
      }
    }

    perStudent.set(student.id, {
      correct,
      wrong,
      done,
      released,
      lessonsDone,
      lessonsReleased,
    })
  }

  let accuracyCorrect = 0
  let accuracyTried = 0
  for (const st of perStudent.values()) {
    accuracyCorrect += st.correct
    accuracyTried += st.correct + st.wrong
  }

  const exercisePills: MetricsPill[] = []
  for (const [key, agg] of pillAgg) {
    const total = agg.correct + agg.wrong
    if (total < 1) continue
    const trail = trailById.get(agg.trailId)
    exercisePills.push({
      key,
      trail_id: agg.trailId,
      trail_name: (trail?.name || agg.trailId).trim(),
      stage_number: agg.stage,
      question_number: agg.q,
      title: titleByKey.get(key) || key,
      gabarito: gabarito.get(key) || '',
      total,
      correct: agg.correct,
      wrong: agg.wrong,
      accuracy_pct: Math.round((agg.correct / total) * 100),
    })
  }
  exercisePills.sort((a, b) => {
    if (a.accuracy_pct !== b.accuracy_pct) return a.accuracy_pct - b.accuracy_pct
    return a.key.localeCompare(b.key)
  })

  const worst = exercisePills.slice(0, 5)
  const best = [...exercisePills]
    .sort((a, b) => {
      if (b.accuracy_pct !== a.accuracy_pct) return b.accuracy_pct - a.accuracy_pct
      return a.key.localeCompare(b.key)
    })
    .slice(0, 5)

  // Barras por etapa (agregado simples: alunos com ≥1 done na etapa)
  const stage_bars: MetricsStageBar[] = []
  for (const trail of activeTrails) {
    const stages = [
      ...new Set(
        input.stages
          .filter((s) => s.trail_id === trail.id)
          .map((s) => s.stage_number),
      ),
    ].sort((a, b) => a - b)
    const enrolled = input.studentTrails.filter(
      (l) => l.trail_id === trail.id && activeIds.has(l.student_id),
    ).length
    for (const stage of stages) {
      let count = 0
      for (const sid of activeIds) {
        const entry = input.studentsMap[sid]
        if (!entry) continue
        const prefix = `${trailIdList.indexOf(trail.id)}|${stage}|`
        const hit = Object.keys(entry.answers ?? {}).some((k) =>
          k.startsWith(prefix),
        )
          || (entry.extra_done ?? []).some((k) => k.startsWith(prefix))
        if (hit) count += 1
      }
      stage_bars.push({
        key: `${trail.id}|${stage}`,
        trail_id: trail.id,
        trail_name: (trail.name || trail.id).trim(),
        stage_number: stage,
        label: `E${stage}`,
        count,
        enrolled_count: enrolled,
      })
    }
  }

  const students: MetricsStudentRow[] = activeStudents.map((s) => {
    const st = perStudent.get(s.id) ?? {
      correct: 0,
      wrong: 0,
      done: 0,
      released: 0,
      lessonsDone: 0,
      lessonsReleased: 0,
    }
    const tried = st.correct + st.wrong
    return {
      id: s.id,
      name: (s.name || s.id).trim(),
      active: s.active !== false,
      done: st.done,
      released: st.released,
      lessons_done: st.lessonsDone,
      lessons_released: st.lessonsReleased,
      correct: st.correct,
      wrong: st.wrong,
      accuracy_pct: pct(st.correct, tried),
    }
  })

  return {
    institution_id: input.institutionId,
    computed_at: now,
    active_students: activeStudents.length,
    active_trails: activeTrails.length,
    avg_completion: pct(doneTotal, releasedTotal),
    avg_lesson_completion: pct(lessonsDoneTotal, lessonsReleasedTotal),
    avg_accuracy: pct(accuracyCorrect, accuracyTried),
    accuracy_correct: accuracyCorrect,
    accuracy_tried: accuracyTried,
    annulled_answers_excluded: annulledAnswersExcluded,
    exercise_count: exercisePills.length,
    worst_pills: worst,
    best_pills: best,
    exercise_pills: exercisePills,
    stage_bars,
    students,
    agent_usage_by_period: input.agentUsageByPeriod,
  }
}

/** Chaves canônicas Sol (t47) que NUNCA podem entrar no denominador. */
export const SOL_ANNULLED_EXERCISE_KEYS = [
  't47|7|15',
  't47|7|16',
  't47|7|52',
] as const

/**
 * Falha se alguma célula anulada conhecida (ou do set `annulled`)
 * aparecer em exercise_pills / worst / best — ou seja, entrou no acerto.
 */
export function assertAnuladasExcludedFromAccuracy(
  metrics: InstitutionDashboardMetrics,
  annulledKeys: Iterable<string> = SOL_ANNULLED_EXERCISE_KEYS,
): void {
  const banned = new Set(
    [...annulledKeys].map((k) => k.trim()).filter(Boolean),
  )
  if (banned.size === 0) return
  const offenders: string[] = []
  for (const pill of [
    ...metrics.exercise_pills,
    ...metrics.worst_pills,
    ...metrics.best_pills,
  ]) {
    if (banned.has(pill.key)) offenders.push(pill.key)
  }
  if (offenders.length > 0) {
    throw new Error(
      `Acerto incluiu células anuladas no denominador: ${[...new Set(offenders)].join(', ')}`,
    )
  }
}

function expandCompact(
  compactKey: string,
  trailIds: string[],
): string | null {
  const sep = compactKey.indexOf('|')
  if (sep < 0) return null
  const trailIdx = Number(compactKey.slice(0, sep))
  const trailId = trailIds[trailIdx]
  if (!trailId) return null
  return `${trailId}${compactKey.slice(sep)}`
}

/** Soma ponderada multi-instituição (correct/tried). */
export function mergeInstitutionMetrics(
  parts: InstitutionDashboardMetrics[],
): Pick<
  InstitutionDashboardMetrics,
  | 'active_students'
  | 'active_trails'
  | 'avg_accuracy'
  | 'accuracy_correct'
  | 'accuracy_tried'
  | 'exercise_count'
  | 'avg_completion'
  | 'avg_lesson_completion'
> {
  let active_students = 0
  let active_trails = 0
  let accuracy_correct = 0
  let accuracy_tried = 0
  let exercise_count = 0
  let done = 0
  let released = 0
  let lessonsDone = 0
  let lessonsReleased = 0
  for (const p of parts) {
    active_students += p.active_students
    active_trails += p.active_trails
    accuracy_correct += p.accuracy_correct
    accuracy_tried += p.accuracy_tried
    exercise_count += p.exercise_count
    // Reconstitui totais a partir das % quando possível via students
    for (const s of p.students) {
      done += s.done
      released += s.released
      lessonsDone += s.lessons_done
      lessonsReleased += s.lessons_released
    }
  }
  return {
    active_students,
    active_trails,
    accuracy_correct,
    accuracy_tried,
    exercise_count,
    avg_accuracy: pct(accuracy_correct, accuracy_tried),
    avg_completion: pct(done, released),
    avg_lesson_completion: pct(lessonsDone, lessonsReleased),
  }
}
