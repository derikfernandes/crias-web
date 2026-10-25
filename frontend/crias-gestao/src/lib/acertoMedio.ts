/**
 * Acerto médio unificado (Início, Dados, multi-instituição).
 *
 * Definição canônica (RO Sol 2026-10-24, valor único):
 * - Só respostas com gabarito; **atividades anuladas fora** do numerador e
 *   do denominador (Gabarito / INTERFACE).
 * - Exclui cliques de UI: "Continuar", "0", vazio e demais comandos.
 * - Fonte densa: conversation_logs / answerMap (dashboard_summary).
 *   `exercise_attempts` na Sol tem só ~136 docs (subconjunto recente) e
 *   sozinho produz 86% enganoso.
 * - Sol (excl. anuladas): **39.108 / 56.863 = 68,8%**.
 *   Um audit anterior (39.215 / 57.611 = 68,1%) incluía 748 respostas em
 *   3 células anuladas de t47 (7|15, 7|16, 7|52) — não usar.
 * - Agregado = correct/tried (ponderado). Multi-instituição soma
 *   numerador e denominador — nunca média das %.
 */

import { isUiCommandText } from './studentFieldValidation'
import { pct } from './gestaoMetrics'
import type { ExerciseAttempt } from '../types/exerciseAttempt'

export type GradableAnswer = {
  student_id: string
  trail_id: string
  stage_number: number
  question_number: number
  /** Resposta bruta do aluno. */
  answer: string
  /** Se já veio de exercise_attempts.is_correct (informativo). */
  is_correct?: boolean | null
}

export type AcertoAggregate = {
  correct: number
  tried: number
  avgAccuracy: number | null
  /** Alunos com pelo menos 1 resposta gradável. */
  studentsWithAnswers: number
}

/** Normaliza resposta para comparar / filtrar comandos. */
export function normalizeAnswerText(value: string): string {
  let s = value.trim()
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim()
  }
  return s
}

/**
 * Clique de continuar / não-resposta: fora do acerto.
 * Inclui "0" (atalho legado de continuar) e textos de botão.
 */
export function isNonGradableAnswer(raw: string): boolean {
  const s = normalizeAnswerText(raw)
  if (!s) return true
  const lower = s.toLowerCase()
  if (lower === '0' || lower === 'continuar' || lower === 'continuar.') {
    return true
  }
  return isUiCommandText(s)
}

/** Mesma regra do server (`answersMatch`): igualdade normalizada. */
export function answersMatchGabarito(
  studentAnswer: string,
  correctOption: string,
): boolean {
  const a = normalizeAnswerText(studentAnswer).toLowerCase()
  const g = normalizeAnswerText(correctOption).toLowerCase()
  return Boolean(a && g && a === g)
}

/**
 * Fora do denominador: texto longo, ou dígito↔letra cruzados (t67),
 * para não inflar tried sem subir correct.
 */
export function isNonOptionAgainstGabarito(
  studentAnswer: string,
  correctOption: string,
): boolean {
  const a = normalizeAnswerText(studentAnswer)
  const g = normalizeAnswerText(correctOption)
  if (!a || !g) return true
  const gLetter = /^[a-d]$/i.test(g)
  const gDigit = /^[1-4]$/.test(g)
  if (!gLetter && !gDigit) return false
  const aLetter = /^[a-d]$/i.test(a)
  const aDigit = /^[1-4]$/.test(a)
  if (!aLetter && !aDigit) return true
  if ((gLetter && aDigit) || (gDigit && aLetter)) return true
  return false
}

export function activityCellKey(
  trailId: string,
  stage: number,
  question: number,
): string {
  return `${trailId}|${stage}|${question}`
}

/**
 * Agrega acerto ponderado por quantidade de respostas gradáveis.
 * `gabarito` / `annulled` usam chave trail|stage|question.
 * Com gabarito no mapa, a nota vem do match (fonte densa / auditável).
 */
export function accuracyAggregate(input: {
  activeStudentIds: Set<string>
  answers: GradableAnswer[]
  gabarito: Map<string, string>
  annulled?: Set<string>
  trailIds?: Set<string>
}): AcertoAggregate {
  let correct = 0
  let tried = 0
  const students = new Set<string>()

  for (const row of input.answers) {
    if (!input.activeStudentIds.has(row.student_id)) continue
    if (
      input.trailIds &&
      row.trail_id &&
      !input.trailIds.has(row.trail_id)
    ) {
      continue
    }
    if (row.stage_number < 1 || row.question_number < 1) continue
    if (isNonGradableAnswer(row.answer)) continue

    const key = activityCellKey(
      row.trail_id,
      row.stage_number,
      row.question_number,
    )
    if (input.annulled?.has(key)) continue
    const gab = input.gabarito.get(key)?.trim()
    if (!gab) continue
    if (isNonOptionAgainstGabarito(row.answer, gab)) continue

    tried += 1
    students.add(row.student_id)
    if (answersMatchGabarito(row.answer, gab)) correct += 1
  }

  return {
    correct,
    tried,
    avgAccuracy: pct(correct, tried),
    studentsWithAnswers: students.size,
  }
}

/** Converte answerMap (studentId|trail|stage|q → answer) em linhas gradáveis. */
export function answersFromAnswerMap(
  answerMap: Map<string, string>,
): GradableAnswer[] {
  const out: GradableAnswer[] = []
  for (const [key, answer] of answerMap) {
    const parts = key.split('|')
    if (parts.length !== 4) continue
    const [student_id, trail_id, stageStr, qStr] = parts
    const stage_number = Number(stageStr)
    const question_number = Number(qStr)
    if (!student_id || !trail_id) continue
    if (!Number.isFinite(stage_number) || !Number.isFinite(question_number)) {
      continue
    }
    out.push({
      student_id,
      trail_id,
      stage_number,
      question_number,
      answer,
    })
  }
  return out
}

/** Tentativas → linhas (resposta + is_correct opcional). */
export function answersFromAttempts(
  attempts: ExerciseAttempt[],
): GradableAnswer[] {
  return attempts.map((a) => ({
    student_id: a.student_id,
    trail_id: a.trail_id,
    stage_number: a.stage_number,
    question_number: a.question_number,
    answer: a.student_answer ?? '',
    is_correct: a.is_correct,
  }))
}

/**
 * Une logs (densos) + tentativas. Chave aluno|trilha|etapa|questão:
 * logs ganham (histórico completo); tentativa só preenche buraco.
 */
export function mergeAnswerSources(
  fromLogs: GradableAnswer[],
  fromAttempts: GradableAnswer[],
): GradableAnswer[] {
  const map = new Map<string, GradableAnswer>()
  for (const a of fromAttempts) {
    const k = `${a.student_id}|${activityCellKey(a.trail_id, a.stage_number, a.question_number)}`
    map.set(k, a)
  }
  for (const a of fromLogs) {
    const k = `${a.student_id}|${activityCellKey(a.trail_id, a.stage_number, a.question_number)}`
    map.set(k, a)
  }
  return [...map.values()]
}

/** Soma ponderada de vários agregados (multi-instituição). */
export function mergeAcertoAggregates(
  parts: Array<Pick<AcertoAggregate, 'correct' | 'tried'>>,
): AcertoAggregate {
  let correct = 0
  let tried = 0
  for (const p of parts) {
    correct += p.correct
    tried += p.tried
  }
  return {
    correct,
    tried,
    avgAccuracy: pct(correct, tried),
    studentsWithAnswers: 0,
  }
}

/** Monta mapa de gabarito a partir do catálogo de questões. */
export function gabaritoFromQuestions(
  questions: Array<{
    trail_id: string
    stage_number: number
    question_number: number
    correct_option?: string | null
    annulled?: boolean
    active?: boolean
  }>,
): { gabarito: Map<string, string>; annulled: Set<string> } {
  const gabarito = new Map<string, string>()
  const annulled = new Set<string>()
  for (const q of questions) {
    if (q.active === false) continue
    const key = activityCellKey(
      q.trail_id,
      q.stage_number,
      q.question_number,
    )
    if (q.annulled === true) {
      annulled.add(key)
      continue
    }
    const co = (q.correct_option ?? '').trim()
    if (co) gabarito.set(key, co)
  }
  return { gabarito, annulled }
}
