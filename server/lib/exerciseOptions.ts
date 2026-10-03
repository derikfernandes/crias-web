/**
 * Opções de exercício para o player e scoring.
 * Firestore costuma ter `options: null` e as alternativas só no `content` (A)/B)/C)).
 * `correct_option` no gabarito desta base costuma ser "1"|"2"|"3" (índice 1-based).
 */

export type ExerciseOption = { key: string; text: string }

function sanitizeOptionText(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s.length ? s : null
}

/** Normaliza options estruturados do doc Firestore. */
export function coerceStructuredOptions(raw: unknown): ExerciseOption[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  const out: ExerciseOption[] = []
  for (const item of raw) {
    if (typeof item === 'string') {
      const s = item.trim()
      if (!s) return null
      const letter = s.match(/^([A-Za-z])\s*[\)\.\:]/)
      out.push({
        key: letter ? letter[1].toUpperCase() : s,
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
 * Ex.: "A) foo" / "B. bar" / "C: baz" → [{key:"A", text:"A) foo"}, ...]
 */
export function parseLetteredChoicesFromContent(
  content: string | null | undefined,
): ExerciseOption[] | null {
  if (typeof content !== 'string' || !content.trim()) return null

  const found: ExerciseOption[] = []
  const seen = new Set<string>()
  const re = /^\s*([A-Za-z])\s*[\)\.\:]\s+(.+?)\s*$/

  for (const line of content.split(/\r?\n/)) {
    const m = line.match(re)
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

/** Prefere options do doc; se vazias, parseia A/B/C do content. */
export function resolveExerciseOptions(
  optionsRaw: unknown,
  content: string | null | undefined,
): ExerciseOption[] | null {
  const structured = coerceStructuredOptions(optionsRaw)
  if (structured) return structured
  return parseLetteredChoicesFromContent(content)
}

/**
 * Normaliza resposta/gabarito para comparação.
 * "A", "A)", "A) texto" → "1"; "B" → "2"; "3" → "3".
 */
export function normalizeAnswerForCompare(answer: string): string {
  const t = answer.trim()
  if (!t) return t

  const letterPrefixed = t.match(/^([A-Za-z])(?:\s*[\)\.\:]|$)/)
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
