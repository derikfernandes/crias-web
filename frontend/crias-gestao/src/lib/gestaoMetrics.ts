import {
  accuracyAggregate,
  answersFromAnswerMap,
  answersFromAttempts,
  gabaritoFromQuestions,
  mergeAnswerSources,
} from './acertoMedio'
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

/** Atividade = par (etapa, questão) na trilha. */
export type ActivityKey = { stage: number; question: number }

export function pct(num: number, den: number): number | null {
  if (den <= 0) return null
  return Math.round((num / den) * 1000) / 10
}

export function activityKeyId(a: ActivityKey): string {
  return `${a.stage}|${a.question}`
}

function compareActivityKeys(a: ActivityKey, b: ActivityKey): number {
  if (a.stage !== b.stage) return a.stage - b.stage
  return a.question - b.question
}

/**
 * Catálogo de atividades por trilha: pares distintos (stage, question) ativos.
 * Ignora números fora de faixa (< 1).
 */
export function activityKeysByTrail(
  questions: Array<
    Pick<TrailStageQuestion, 'trail_id' | 'stage_number' | 'question_number' | 'active'>
  >,
): Map<string, ActivityKey[]> {
  const seen = new Map<string, Map<string, ActivityKey>>()
  for (const q of questions) {
    if (!q.active) continue
    if (q.stage_number < 1 || q.question_number < 1) continue
    const key = activityKeyId({
      stage: q.stage_number,
      question: q.question_number,
    })
    const byTrail = seen.get(q.trail_id) ?? new Map<string, ActivityKey>()
    if (!byTrail.has(key)) {
      byTrail.set(key, {
        stage: q.stage_number,
        question: q.question_number,
      })
    }
    seen.set(q.trail_id, byTrail)
  }
  const out = new Map<string, ActivityKey[]>()
  for (const [id, map] of seen) {
    out.set(
      id,
      [...map.values()].sort(compareActivityKeys),
    )
  }
  return out
}

/** Número de atividades = quantidade de pares (stage, question). */
export function activityCountByTrail(
  questions: Array<
    Pick<TrailStageQuestion, 'trail_id' | 'stage_number' | 'question_number' | 'active'>
  >,
): Map<string, number> {
  const keys = activityKeysByTrail(questions)
  const out = new Map<string, number>()
  for (const [id, list] of keys) out.set(id, list.length)
  return out
}

/** Índice rápido: stage → questões ordenadas do catálogo. */
export function questionsByStage(
  catalog: ActivityKey[],
): Map<number, number[]> {
  const map = new Map<number, number[]>()
  for (const a of catalog) {
    const list = map.get(a.stage) ?? []
    list.push(a.question)
    map.set(a.stage, list)
  }
  for (const [, list] of map) list.sort((a, b) => a - b)
  return map
}

/**
 * Posição efetiva do aluno no catálogo, com clamp de chaves fora da faixa
 * (ex.: question 101 / stage 13 em trilha 12×100).
 * Retorna o índice da próxima atividade a fazer (0..catalog.length).
 */
export function progressIndexInCatalog(
  link: Pick<
    StudentTrail,
    'status' | 'current_stage_number' | 'current_question_number'
  >,
  catalog: ActivityKey[],
): number {
  if (catalog.length === 0) return 0
  if (link.status === 'not_started') return 0

  const stage = link.current_stage_number
  const question = link.current_question_number
  if (!Number.isFinite(stage) || stage < 1) return 0
  if (!Number.isFinite(question) || question < 1) {
    // Etapa marcada sem questão válida: conta etapas anteriores.
    let idx = 0
    while (idx < catalog.length && catalog[idx].stage < stage) idx += 1
    return idx
  }

  let idx = 0
  while (idx < catalog.length) {
    const a = catalog[idx]
    if (a.stage < stage) {
      idx += 1
      continue
    }
    if (a.stage === stage && a.question < question) {
      idx += 1
      continue
    }
    break
  }
  return idx
}

/**
 * Atividades concluídas: etapas anteriores por completo +
 * (current_question_number - 1) na etapa atual, no catálogo (stage, question).
 * Não trata `status === 'completed'` como 100% automático.
 */
export function doneActivities(
  link: Pick<
    StudentTrail,
    'status' | 'current_stage_number' | 'current_question_number'
  >,
  catalogOrTotal: ActivityKey[] | number,
): number {
  if (typeof catalogOrTotal === 'number') {
    // Compat: total numérico sem catálogo (legado / testes).
    const total = catalogOrTotal
    if (total <= 0) return 0
    if (link.status === 'not_started') return 0
    // Sem etapas no catálogo legado: assume 1 etapa com `total` questões.
    return Math.max(
      0,
      Math.min(total, (link.current_question_number || 1) - 1),
    )
  }
  const catalog = catalogOrTotal
  return progressIndexInCatalog(link, catalog)
}

/** Atividade do catálogo já concluída no vínculo? */
export function isActivityKeyDoneOnLink(
  link: Pick<
    StudentTrail,
    'status' | 'current_stage_number' | 'current_question_number'
  >,
  activity: ActivityKey,
  catalog: ActivityKey[],
): boolean {
  if (catalog.length === 0) return false
  if (link.status === 'not_started') return false
  // Fora do catálogo: ignora.
  if (
    !catalog.some(
      (a) => a.stage === activity.stage && a.question === activity.question,
    )
  ) {
    return false
  }
  const stage = link.current_stage_number
  const question = link.current_question_number
  if (activity.stage < stage) return true
  if (activity.stage === stage && activity.question < question) return true
  return false
}

/** Etapa concluída: todas as atividades da etapa estão feitas. */
export function isStageDoneOnLink(
  link: Pick<
    StudentTrail,
    'status' | 'current_stage_number' | 'current_question_number'
  >,
  stage: number,
  catalog: ActivityKey[],
): boolean {
  const inStage = catalog.filter((a) => a.stage === stage)
  if (inStage.length === 0) return false
  return inStage.every((a) => isActivityKeyDoneOnLink(link, a, catalog))
}

/**
 * Acerto agregado: tentativas dos alunos ativos da instituição,
 * por student_id (mesma regra do card Dados). Não exige institution_id
 * no documento da tentativa (campo às vezes ausente).
 */
export function accuracyFromActiveStudents(input: {
  activeStudentIds: Set<string>
  attempts: ExerciseAttempt[]
  /** Se informado, ignora tentativas fora destes trails. */
  trailIds?: Set<string>
}): { correct: number; tried: number; avgAccuracy: number | null } {
  let correct = 0
  let tried = 0
  for (const a of input.attempts) {
    if (!input.activeStudentIds.has(a.student_id)) continue
    if (input.trailIds && a.trail_id && !input.trailIds.has(a.trail_id)) {
      continue
    }
    // Clamp: ignora stage/question inválidos quando presentes e < 1.
    if (
      (a.stage_number != null && a.stage_number < 1) ||
      (a.question_number != null && a.question_number < 1)
    ) {
      continue
    }
    tried += 1
    if (a.is_correct) correct += 1
  }
  return { correct, tried, avgAccuracy: pct(correct, tried) }
}

/**
 * Ativos (7 dias): último timestamp em exercise_attempts
 * (attempted_at / created_at). Não usa student_trails.last_interaction_at
 * (pode ter sido atualizado em lote).
 */
export function activeStudentsLast7Days(input: {
  activeStudentIds: Set<string>
  attempts: ExerciseAttempt[]
  /** millis por student_id de outra fonte (ex.: conversation_logs). */
  extraLastActivityMs?: Map<string, number>
  now?: number
}): number {
  const now = input.now ?? Date.now()
  const lastByStudent = new Map<string, number>()
  if (input.extraLastActivityMs) {
    for (const [id, ms] of input.extraLastActivityMs) {
      if (input.activeStudentIds.has(id) && ms > 0) lastByStudent.set(id, ms)
    }
  }
  for (const a of input.attempts) {
    if (!input.activeStudentIds.has(a.student_id)) continue
    const ms =
      a.attempted_at?.toMillis?.() ??
      a.created_at?.toMillis?.() ??
      a.updated_at?.toMillis?.() ??
      0
    if (ms <= 0) continue
    const prev = lastByStudent.get(a.student_id) ?? 0
    if (ms > prev) lastByStudent.set(a.student_id, ms)
  }
  let n = 0
  for (const [, ms] of lastByStudent) {
    if (now - ms <= SEVEN_DAYS_MS) n += 1
  }
  return n
}

/**
 * Resumo de uma instituição para o Início da Gestão.
 * Conclusão: atividades feitas (stage+question) sobre o catálogo dos vínculos.
 * Acerto: mesma função do card Dados (por student_id dos ativos).
 * Concluiu: progresso real 100%, não só status no vínculo.
 */
export function institutionMetrics(input: {
  institutionId: string
  students: Student[]
  trails: Trail[]
  studentTrails: StudentTrail[]
  activityTotals: Map<string, number>
  /** Catálogo (stage, question) por trilha; se omitido, usa total numérico legado. */
  activityCatalogs?: Map<string, ActivityKey[]>
  attempts: ExerciseAttempt[]
  /**
   * Respostas densas (dashboard_summary / conversation_logs).
   * Quando presente com `questions`, o acerto usa a definição unificada
   * (exclui Continuar/0; logs + attempts) — não só exercise_attempts.
   */
  answerMap?: Map<string, string>
  questions?: Array<
    Pick<
      TrailStageQuestion,
      | 'trail_id'
      | 'stage_number'
      | 'question_number'
      | 'correct_option'
      | 'annulled'
      | 'active'
    >
  >
  extraLastActivityMs?: Map<string, number>
  now?: number
}): InstitutionMetrics {
  const now = input.now ?? Date.now()
  const students = input.students.filter(
    (s) => s.institution_id === input.institutionId,
  )
  const active = students.filter((s) => s.active)
  const activeIds = new Set(active.map((s) => s.id))
  // Alinha com Dados: só trilhas ativas da instituição.
  const trails = input.trails.filter(
    (t) => t.institution_id === input.institutionId && t.active,
  )
  const trailIds = new Set(trails.map((t) => t.id))
  const links = input.studentTrails.filter(
    (st) =>
      st.institution_id === input.institutionId && trailIds.has(st.trail_id),
  )

  const inProgress = new Set<string>()
  const completed = new Set<string>()
  let notStarted = 0
  let done = 0
  let total = 0

  const linksByStudent = new Map<string, StudentTrail[]>()
  for (const link of links) {
    const arr = linksByStudent.get(link.student_id) ?? []
    arr.push(link)
    linksByStudent.set(link.student_id, arr)
  }

  for (const link of links) {
    if (link.status === 'not_started') notStarted += 1
    if (!activeIds.has(link.student_id)) continue
    const catalog = input.activityCatalogs?.get(link.trail_id)
    const count =
      catalog?.length ?? input.activityTotals.get(link.trail_id) ?? 0
    const linkDone = catalog
      ? doneActivities(link, catalog)
      : doneActivities(link, count)
    done += linkDone
    total += count
  }

  for (const [studentId, studentLinks] of linksByStudent) {
    if (!activeIds.has(studentId)) continue
    if (studentLinks.length === 0) continue
    const allDone = studentLinks.every((l) => {
      const catalog = input.activityCatalogs?.get(l.trail_id)
      const count =
        catalog?.length ?? input.activityTotals.get(l.trail_id) ?? 0
      if (count <= 0) return false
      const d = catalog
        ? doneActivities(l, catalog)
        : doneActivities(l, count)
      return d >= count
    })
    if (allDone) {
      completed.add(studentId)
      continue
    }
    if (
      studentLinks.some(
        (l) => l.status === 'in_progress' || l.status === 'completed',
      )
    ) {
      inProgress.add(studentId)
    }
  }

  // Acerto unificado: logs densos + attempts, exclui Continuar/0.
  // Só attempts na Sol ≈ 86% (136 docs); com logs ≈ 68,1% (fonte correta).
  const allInstTrailIds = new Set(
    input.trails
      .filter((t) => t.institution_id === input.institutionId)
      .map((t) => t.id),
  )
  let avgAccuracy: number | null
  const hasDenseLogs = Boolean(input.answerMap && input.answerMap.size > 0)
  if (hasDenseLogs && input.questions && input.questions.length > 0) {
    const { gabarito, annulled } = gabaritoFromQuestions(input.questions)
    const answers = mergeAnswerSources(
      answersFromAnswerMap(input.answerMap!),
      answersFromAttempts(input.attempts),
    )
    avgAccuracy = accuracyAggregate({
      activeStudentIds: activeIds,
      answers,
      gabarito,
      annulled,
      trailIds: allInstTrailIds.size > 0 ? allInstTrailIds : undefined,
    }).avgAccuracy
  } else {
    // Fallback legado (sem logs): attempts por student_id (Sol ≈ 86% incompleto).
    avgAccuracy = accuracyFromActiveStudents({
      activeStudentIds: activeIds,
      attempts: input.attempts,
      trailIds: allInstTrailIds.size > 0 ? allInstTrailIds : undefined,
    }).avgAccuracy
  }

  return {
    activeStudents: active.length,
    activeTrails: trails.filter((t) => t.active).length,
    activeLast7Days: activeStudentsLast7Days({
      activeStudentIds: activeIds,
      attempts: input.attempts,
      extraLastActivityMs: input.extraLastActivityMs,
      now,
    }),
    inProgress: inProgress.size,
    completed: completed.size,
    notStarted,
    avgCompletion: pct(done, total),
    avgAccuracy,
  }
}

export function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A'
  return `${String(value).replace('.', ',')} %`
}
