/**
 * Auditoria objetiva do denominador do Acerto (Sol).
 * Classifica cada resposta do mapa compacto vs gabarito/anuladas/não-gradável.
 */
import { isUiCommandText } from './studentFieldValidation'
import type {
  CompactStudentEntry,
  MetricsQuestion,
  MetricsStudent,
  MetricsTrail,
} from './dashboardInstitutionMetrics'

export type DenomAnswerClass =
  | 'non_gradable_empty'
  | 'non_gradable_continuar'
  | 'non_gradable_zero'
  | 'non_gradable_ui_command'
  | 'annulled'
  | 'no_gabarito'
  | 'graded_correct'
  | 'graded_wrong'
  | 'inactive_student'
  | 'unknown_trail'

export type DenomCellBucket = {
  key: string
  trail_id: string
  stage_number: number
  question_number: number
  gabarito: string
  annulled: boolean
  trail_active: boolean | null
  count: number
  /** Amostra de respostas (até 8), para tipificar o +548. */
  sample_answers: string[]
  classes: Partial<Record<DenomAnswerClass, number>>
}

export type DenomAuditResult = {
  institution_id: string
  active_students: number
  totals: Record<DenomAnswerClass, number>
  /** Respostas que entram no denominador atual (correct+wrong). */
  denom_current: number
  correct_current: number
  /** Respostas com texto mas sem gabarito (NÃO devem entrar). */
  no_gabarito: number
  /** Pills/células no denom com gabarito vazio (bug se >0). */
  denom_cells_empty_gabarito: number
  by_cell_in_denom: DenomCellBucket[]
  by_cell_no_gabarito: DenomCellBucket[]
  /** Top células por volume no denom (desc). */
  top_denom_cells: DenomCellBucket[]
  /** Classes de texto nas respostas graded_wrong (candidatas ao +548). */
  wrong_answer_shapes: Array<{ shape: string; count: number }>
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

function classifyNonGradable(raw: string): DenomAnswerClass | null {
  const s = normalizeAnswer(raw)
  if (!s) return 'non_gradable_empty'
  const lower = s.toLowerCase()
  if (lower === '0') return 'non_gradable_zero'
  if (lower === 'continuar' || lower === 'continuar.') {
    return 'non_gradable_continuar'
  }
  if (isUiCommandText(s)) return 'non_gradable_ui_command'
  return null
}

function answersMatch(studentAnswer: string, correctOption: string): boolean {
  const a = normalizeAnswer(studentAnswer).toLowerCase()
  const g = normalizeAnswer(correctOption).toLowerCase()
  return Boolean(a && g && a === g)
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

function answerShape(raw: string): string {
  const s = normalizeAnswer(raw)
  if (!s) return '(empty)'
  const lower = s.toLowerCase()
  if (lower === 'continuar' || lower === 'continuar.') return 'Continuar'
  if (lower === '0') return '0'
  if (/^[a-d]$/i.test(s)) return `letter:${s.toUpperCase()}`
  if (/^[1-4]$/.test(s)) return `digit:${s}`
  if (isUiCommandText(s)) return `ui:${lower.slice(0, 40)}`
  if (s.length <= 3) return `short:${s}`
  if (s.length <= 12) return `text_short:${s.slice(0, 12)}`
  return `text_long(len=${s.length})`
}

function emptyTotals(): Record<DenomAnswerClass, number> {
  return {
    non_gradable_empty: 0,
    non_gradable_continuar: 0,
    non_gradable_zero: 0,
    non_gradable_ui_command: 0,
    annulled: 0,
    no_gabarito: 0,
    graded_correct: 0,
    graded_wrong: 0,
    inactive_student: 0,
    unknown_trail: 0,
  }
}

function touchCell(
  map: Map<string, DenomCellBucket>,
  key: string,
  meta: {
    trail_id: string
    stage_number: number
    question_number: number
    gabarito: string
    annulled: boolean
    trail_active: boolean | null
  },
  cls: DenomAnswerClass,
  answer: string,
): void {
  let b = map.get(key)
  if (!b) {
    b = {
      key,
      trail_id: meta.trail_id,
      stage_number: meta.stage_number,
      question_number: meta.question_number,
      gabarito: meta.gabarito,
      annulled: meta.annulled,
      trail_active: meta.trail_active,
      count: 0,
      sample_answers: [],
      classes: {},
    }
    map.set(key, b)
  }
  b.count += 1
  b.classes[cls] = (b.classes[cls] ?? 0) + 1
  if (b.sample_answers.length < 8) {
    const n = normalizeAnswer(answer)
    if (n && !b.sample_answers.includes(n)) b.sample_answers.push(n)
  }
}

/**
 * Percorre o mapa compacto com as mesmas regras de
 * `computeInstitutionDashboardMetrics` (+ classificação fina).
 */
export function auditSolDenom(input: {
  institutionId: string
  trailIds: string[]
  studentsMap: Record<string, CompactStudentEntry>
  students: MetricsStudent[]
  trails: MetricsTrail[]
  questions: MetricsQuestion[]
  /** Se true, ignora respostas de trilhas inativas (hipótese canônica). */
  activeTrailsOnly?: boolean
}): DenomAuditResult {
  const trailById = new Map(input.trails.map((t) => [t.id, t]))
  const activeStudents = input.students.filter((s) => s.active !== false)
  const activeIds = new Set(activeStudents.map((s) => s.id))

  const gabarito = new Map<string, string>()
  const annulled = new Set<string>()
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
  }

  const totals = emptyTotals()
  const denomCells = new Map<string, DenomCellBucket>()
  const noGabCells = new Map<string, DenomCellBucket>()
  const wrongShapes = new Map<string, number>()
  let denomEmptyGab = 0

  for (const student of input.students) {
    const entry = input.studentsMap[student.id]
    if (!entry) continue
    const isActive = activeIds.has(student.id)

    for (const [compact, answer] of Object.entries(entry.answers ?? {})) {
      const expanded = expandCompact(compact, input.trailIds)
      if (!expanded) {
        totals.unknown_trail += 1
        continue
      }
      const [trailId, stageStr, qStr] = expanded.split('|')
      const stage = Number(stageStr)
      const qn = Number(qStr)
      const trail = trailById.get(trailId)
      const meta = {
        trail_id: trailId,
        stage_number: stage,
        question_number: qn,
        gabarito: gabarito.get(expanded) ?? '',
        annulled: annulled.has(expanded),
        trail_active: trail ? trail.active !== false : null,
      }

      if (!isActive) {
        totals.inactive_student += 1
        continue
      }

      if (input.activeTrailsOnly && trail && trail.active === false) {
        // Conta como fora do denom canônico (trilha inativa).
        totals.unknown_trail += 1
        continue
      }
      if (input.activeTrailsOnly && !trail) {
        totals.unknown_trail += 1
        continue
      }

      const ng = classifyNonGradable(answer)
      if (ng) {
        totals[ng] += 1
        continue
      }

      if (annulled.has(expanded)) {
        totals.annulled += 1
        touchCell(denomCells, expanded, meta, 'annulled', answer)
        continue
      }

      const g = gabarito.get(expanded)
      if (!g) {
        totals.no_gabarito += 1
        touchCell(noGabCells, expanded, meta, 'no_gabarito', answer)
        continue
      }

      const ok = answersMatch(answer, g)
      const cls: DenomAnswerClass = ok ? 'graded_correct' : 'graded_wrong'
      totals[cls] += 1
      touchCell(denomCells, expanded, { ...meta, gabarito: g }, cls, answer)
      if (!ok) {
        const shape = answerShape(answer)
        wrongShapes.set(shape, (wrongShapes.get(shape) ?? 0) + 1)
      }
      if (!g.trim()) denomEmptyGab += 1
    }
  }

  const by_cell_in_denom = [...denomCells.values()]
    .filter((c) => (c.classes.graded_correct ?? 0) + (c.classes.graded_wrong ?? 0) > 0)
    .sort((a, b) => b.count - a.count)

  // Sanity: cells counted in denom must have gabarito
  for (const c of by_cell_in_denom) {
    if (!c.gabarito.trim()) denomEmptyGab += c.count
  }

  return {
    institution_id: input.institutionId,
    active_students: activeStudents.length,
    totals,
    denom_current: totals.graded_correct + totals.graded_wrong,
    correct_current: totals.graded_correct,
    no_gabarito: totals.no_gabarito,
    denom_cells_empty_gabarito: denomEmptyGab,
    by_cell_in_denom,
    by_cell_no_gabarito: [...noGabCells.values()].sort(
      (a, b) => b.count - a.count,
    ),
    top_denom_cells: by_cell_in_denom.slice(0, 30),
    wrong_answer_shapes: [...wrongShapes.entries()]
      .map(([shape, count]) => ({ shape, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 40),
  }
}

/** Diff vs canônico 39108/56863: o que sobra no tried atual. */
export function summarizeDenomDelta(
  audit: DenomAuditResult,
  canonicalTried = 56863,
  canonicalCorrect = 39108,
): {
  delta_tried: number
  delta_correct: number
  hypothesis: string
  /** Se no_gabarito ≈ delta, remover do denom fecha o gap. */
  no_gabarito_explains_delta: boolean
} {
  const delta_tried = audit.denom_current - canonicalTried
  const delta_correct = audit.correct_current - canonicalCorrect
  const no_gabarito_explains_delta =
    audit.no_gabarito > 0 &&
    Math.abs(audit.no_gabarito - delta_tried) <= 5 &&
    delta_correct === 0

  let hypothesis =
    'Investigar células graded_wrong vs snapshot; possible gabarito novo em células antigas.'
  if (delta_correct === 0 && delta_tried > 0 && audit.denom_cells_empty_gabarito > 0) {
    hypothesis =
      'BUG: respostas entraram no denominador com gabarito vazio.'
  } else if (no_gabarito_explains_delta) {
    hypothesis =
      'Respostas sem gabarito ≈ +delta (não deveriam entrar; se entraram, bug).'
  } else if (delta_correct === 0 && delta_tried > 0) {
    hypothesis =
      'Critério/catálogo: +tried todos wrong (gabarito novo em células com respostas antigas, ou filtro mais frouxo). Não é crescimento misto de respostas novas.'
  }

  return {
    delta_tried,
    delta_correct,
    hypothesis,
    no_gabarito_explains_delta,
  }
}
