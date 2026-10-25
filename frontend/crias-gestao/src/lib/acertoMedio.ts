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
 * - Alias Gestão (owner 2026-10-25): gabarito letra A–D casa com
 *   resposta 1–4 (1=A…4=D). **Não** aplica quando o gabarito é numérico.
 * - Texto longo / enunciado colado contra alternativa: fora do denom.
 * - Anuladas e sem gabarito: fora. Agregado = correct/tried (ponderado).
 *   Multi-instituição soma numerador e denominador — nunca média das %.
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

/**
 * Match Gestão: igualdade normalizada; se gabarito é letra A–D,
 * resposta 1–4 casa (1=A…4=D). Gabarito numérico: sem alias.
 */
export function answersMatchGabarito(
  studentAnswer: string,
  correctOption: string,
): boolean {
  const a = normalizeAnswerText(studentAnswer).toLowerCase()
  const g = normalizeAnswerText(correctOption).toLowerCase()
  if (!a || !g) return false
  if (a === g) return true
  if (/^[a-d]$/.test(g) && /^[1-4]$/.test(a)) {
    const digitToLetter: Record<string, string> = {
      '1': 'a',
      '2': 'b',
      '3': 'c',
      '4': 'd',
    }
    return digitToLetter[a] === g
  }
  return false
}

/** Texto longo contra gabarito A–D / 1–4: fora do denominador. */
export function isNonOptionAgainstGabarito(
  studentAnswer: string,
  correctOption: string,
): boolean {
  const a = normalizeAnswerText(studentAnswer)
  const g = normalizeAnswerText(correctOption)
  if (!a || !g) return true
  const gIsOption = /^[a-d]$/i.test(g) || /^[1-4]$/.test(g)
  if (!gIsOption) return false
  const aIsOption = /^[a-d]$/i.test(a) || /^[1-4]$/.test(a)
  return !aIsOption
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
