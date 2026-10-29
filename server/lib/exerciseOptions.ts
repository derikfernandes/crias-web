/**
 * Opções de exercício para o player e scoring.
 * Firestore costuma ter `options: null` e as alternativas só no `content`
 * (`A)`, `A.`, `(A)`, `1)`, `1.`, etc.).
 * `correct_option` no gabarito desta base costuma ser "1"|"2"|"3" (índice 1-based).
 */

import { extractAnswerKey, parseExerciseContent } from './exerciseParse'

export type ExerciseOption = { key: string; text: string }

function sanitizeOptionText(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s.length ? s : null
}

function parseChoiceKeyFromString(s: string): string {
  const letter = s.match(/^\(?([A-Za-z])\)?\s*[\)\.\:]/)
  if (letter) return letter[1].toUpperCase()
  const numbered = s.match(/^\(?(\d{1,2})\)?\s*[\)\.\:]/)
  if (numbered) return String(Number(numbered[1]))
  return s
}

/** Normaliza options estruturados do doc Firestore. */
export function coerceStructuredOptions(raw: unknown): ExerciseOption[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  const out: ExerciseOption[] = []
  for (const item of raw) {
    if (typeof item === 'string') {
      const s = item.trim()
      if (!s) return null
      out.push({
        key: parseChoiceKeyFromString(s),
        text: s,
      })
      continue
    }
    if (!item || typeof item !== 'object') return null
    const o = item as Record<string, unknown>
    const key = sanitizeOptionText(o.key)
    const text = sanitizeOptionText(o.text)
    if (!key || !text) return null
    out.push({ key, text })
  }
  return out.length ? out : null
}

/**
 * Extrai alternativas lettered do texto da questão (separação única em exerciseParse.ts):
 * a partir da linha "A)" (também "A.", "A:", "(A)", "a)") já é alternativa; o que está acima é enunciado.
 */
export function parseLetteredChoicesFromContent(
  content: string | null | undefined,
): ExerciseOption[] | null {
  const parsed = parseExerciseContent(content)
  if (parsed.style !== 'letter') return null
  return parsed.options.map((o) => ({ key: o.key, text: `${o.key}) ${o.text}` }))
}

/**
 * Extrai alternativas numeradas do texto da questão (ex.: t62): "1) foo", "1. bar", "(1) qux".
 */
export function parseNumberedChoicesFromContent(
  content: string | null | undefined,
): ExerciseOption[] | null {
  const parsed = parseExerciseContent(content)
  if (parsed.style !== 'number') return null
  return parsed.options.map((o) => ({ key: o.key, text: `${o.key}) ${o.text}` }))
}

/**
 * Enunciado sem o bloco de alternativas e sem a linha de gabarito (os botões mostram as alternativas e o
 * gabarito só fica no sistema). Linhas como "I." e "II." do enunciado nunca são removidas.
 */
export function stripLetteredChoicesFromContent(
  content: string | null | undefined,
): string | null {
  if (typeof content !== 'string') return null
  const out = parseExerciseContent(content).statement
  return out.length ? out : null
}

/** Prefere options do doc; se vazias, separa A/B/C ou 1/2/3 do content. */
export function resolveExerciseOptions(
  optionsRaw: unknown,
  content: string | null | undefined,
): ExerciseOption[] | null {
  const structured = coerceStructuredOptions(optionsRaw)
  if (structured) return structured
  const parsed = parseExerciseContent(content)
  if (parsed.options.length < 2) return null
  return parsed.options.map((o) => ({ key: o.key, text: `${o.key}) ${o.text}` }))
}

/** Gabarito escrito dentro do próprio conteúdo do exercício, abaixo das alternativas ("Gabarito: B"). */
export function answerKeyFromExerciseContent(content: string | null | undefined): string | null {
  return parseExerciseContent(content).answerKey
}

export type CorrectKeySource = 'correct_option' | 'exercise_content' | 'next_content' | 'feedback' | null

/**
 * Gabarito único do exercício, para pontuar a tentativa E para o feedback usar a mesma letra.
 * Ordem: (1) correct_option gravado (a Gestão edita e anula por ele), (2) gabarito escrito no conteúdo do
 * exercício, (3) "A resposta é X" na etapa seguinte (feedback da escola), (4) o texto do feedback gerado.
 * `conflict` guarda as demais fontes quando elas discordam da escolhida, para auditoria.
 */
export function resolveCorrectKey(input: {
  correctOption?: string | null
  exerciseContent?: string | null
  nextContent?: string | null
  feedbackText?: string | null
}): { key: string | null; source: CorrectKeySource; conflict: Array<{ source: string; key: string }> } {
  const fromDb = typeof input.correctOption === 'string' && input.correctOption.trim() ? input.correctOption.trim() : null
  const candidates: Array<{ source: Exclude<CorrectKeySource, null>; key: string | null }> = [
    { source: 'correct_option', key: fromDb },
    { source: 'exercise_content', key: answerKeyFromExerciseContent(input.exerciseContent) },
    { source: 'next_content', key: extractAnswerKey(input.nextContent, { allowBare: true }) },
    { source: 'feedback', key: extractAnswerKey(input.feedbackText) },
  ]
  const chosen = candidates.find((c) => c.key)
  if (!chosen?.key) return { key: null, source: null, conflict: [] }
  const norm = normalizeAnswerForCompare(chosen.key)
  const conflict = candidates
    .filter((c) => c.key && c.source !== chosen.source && normalizeAnswerForCompare(c.key) !== norm)
    .map((c) => ({ source: c.source, key: c.key as string }))
  return { key: chosen.key, source: chosen.source, conflict }
}

/**
 * Normaliza resposta/gabarito para comparação.
 * "A", "A)", "(A)", "A) texto" → "1"; "B" → "2"; "3" → "3".
 */
export function normalizeAnswerForCompare(answer: string): string {
  const t = answer.trim()
  if (!t) return t

  const letterPrefixed = t.match(/^\(?([A-Za-z])\)?(?:\s*[\)\.\:]|$)/)
  if (letterPrefixed) {
    const idx = letterPrefixed[1].toUpperCase().charCodeAt(0) - 64
    if (idx >= 1 && idx <= 26) return String(idx)
  }

  if (/^\d+$/.test(t)) return String(Number(t))

  return t
}

export function answersMatch(
  studentAnswer: string,
  correctOption: string,
): boolean {
  return (
    normalizeAnswerForCompare(studentAnswer) ===
    normalizeAnswerForCompare(correctOption)
  )
}
