/**
 * Opções de exercício para o player e scoring.
 * Firestore costuma ter `options: null` e as alternativas só no `content`
 * (`A)`, `A.`, `(A)`, `1)`, `1.`, etc.).
 * `correct_option` no gabarito desta base costuma ser "1"|"2"|"3" (índice 1-based).
 */

export type ExerciseOption = { key: string; text: string }

/** Linha de opção: A) / A. / A: / (A) / (A) texto */
const LETTERED_OPTION_LINE =
  /^\s*\(?([A-Za-z])\)?\s*[\)\.\:]\s+(.+?)\s*$/

/** Linha de opção numerada: 1) / 1. / 1: / (1) texto */
const NUMBERED_OPTION_LINE =
  /^\s*\(?(\d{1,2})\)?\s*[\)\.\:]\s+(.+?)\s*$/

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
 * Extrai alternativas lettered do texto da questão.
 * Aceita: "A) foo", "A. bar", "A: baz", "(A) qux".
 */
export function parseLetteredChoicesFromContent(
  content: string | null | undefined,
): ExerciseOption[] | null {
  if (typeof content !== 'string' || !content.trim()) return null

  const found: ExerciseOption[] = []
  const seen = new Set<string>()

  for (const line of content.split(/\r?\n/)) {
    const m = line.match(LETTERED_OPTION_LINE)
    if (!m) continue
    const key = m[1].toUpperCase()
    const body = m[2].trim()
    if (!body || seen.has(key)) continue
    seen.add(key)
    found.push({ key, text: `${key}) ${body}` })
  }

  if (found.length < 2) return null

  // Exige sequência a partir de A (evita falso positivo no enunciado).
  for (let i = 0; i < found.length; i++) {
    const expected = String.fromCharCode(65 + i) // A, B, C...
    if (found[i].key !== expected) return null
  }

  return found
}

/**
 * Extrai alternativas numeradas do texto da questão (ex.: t62).
 * Aceita: "1) foo", "1. bar", "1: baz", "(1) qux".
 */
export function parseNumberedChoicesFromContent(
  content: string | null | undefined,
): ExerciseOption[] | null {
  if (typeof content !== 'string' || !content.trim()) return null

  const found: ExerciseOption[] = []
  const seen = new Set<string>()

  for (const line of content.split(/\r?\n/)) {
    const m = line.match(NUMBERED_OPTION_LINE)
    if (!m) continue
    const key = String(Number(m[1]))
    const body = m[2].trim()
    if (!body || seen.has(key)) continue
    // Evita capturar "A) …" como numerado (letra já tratada no outro parser).
    if (!/^\d+$/.test(key) || Number(key) < 1) continue
    seen.add(key)
    found.push({ key, text: `${key}) ${body}` })
  }

  if (found.length < 2) return null

  // Exige sequência a partir de 1 (evita falso positivo no enunciado).
  for (let i = 0; i < found.length; i++) {
    if (found[i].key !== String(i + 1)) return null
  }

  return found
}

/**
 * Remove linhas de opções (lettered ou numeradas) do enunciado quando há botões.
 * Evita duplicar "(A) …" / "1) …" como texto estático + botão.
 */
export function stripLetteredChoicesFromContent(
  content: string | null | undefined,
): string | null {
  if (typeof content !== 'string') return null
  const kept: string[] = []
  for (const line of content.split(/\r?\n/)) {
    if (LETTERED_OPTION_LINE.test(line) || NUMBERED_OPTION_LINE.test(line)) {
      continue
    }
    kept.push(line)
  }
  const out = kept.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  return out.length ? out : null
}

/** Prefere options do doc; se vazias, parseia A/B/C ou 1/2/3 do content. */
export function resolveExerciseOptions(
  optionsRaw: unknown,
  content: string | null | undefined,
): ExerciseOption[] | null {
  const structured = coerceStructuredOptions(optionsRaw)
  if (structured) return structured
  return (
    parseLetteredChoicesFromContent(content) ??
    parseNumberedChoicesFromContent(content)
  )
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
