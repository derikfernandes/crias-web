/**
 * Parser leve de opções MCQ a partir do campo `options` ou do texto do enunciado.
 * Submissão usa sempre a `key` (ex.: "A") — alinhado a `correct_option` no motor.
 */

import { parseExerciseContent } from './exerciseParse'

export type TrilhaOption = {
  key: string
  label: string
}

function optionLabel(key: string, text: string): string {
  const t = text.trim()
  if (!t) return key
  // Evitar "A) A) Lado" se o texto já começa com a chave.
  const prefix = new RegExp(`^${escapeRegExp(key)}\\s*[\\)\\.\:\\-–—]\\s*`, 'i')
  if (prefix.test(t)) return t
  return `${key}) ${t}`
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Normaliza `options` Firestore `{ key, text }` / strings / label. */
export function normalizeOptions(raw: unknown): TrilhaOption[] | null {
  if (raw == null) return null
  if (Array.isArray(raw)) {
    const opts: TrilhaOption[] = []
    for (const o of raw) {
      if (typeof o === 'string') {
        const parsed = parseSingleOptionLine(o.trim())
        if (parsed) opts.push(parsed)
        else if (o.trim()) {
          const key = String.fromCodePoint(65 + opts.length)
          opts.push({ key, label: optionLabel(key, o.trim()) })
        }
        continue
      }
      if (!o || typeof o !== 'object') continue
      const rec = o as { key?: unknown; text?: unknown; label?: unknown }
      const key =
        typeof rec.key === 'string' && rec.key.trim()
          ? rec.key.trim()
          : null
      const text =
        typeof rec.text === 'string' && rec.text.trim()
          ? rec.text.trim()
          : typeof rec.label === 'string' && rec.label.trim()
            ? rec.label.trim()
            : null
      if (key && text) {
        opts.push({ key, label: optionLabel(key, text) })
      } else if (text && !key) {
        const k = String.fromCodePoint(65 + opts.length)
        opts.push({ key: k, label: optionLabel(k, text) })
      }
    }
    return opts.length >= 2 ? opts : null
  }
  return null
}

function parseSingleOptionLine(line: string): TrilhaOption | null {
  const letter = line.match(/^([A-Da-d])\s*[\)\.\:\-–—]\s*(.+)$/)
  if (letter) {
    const key = letter[1]!.toUpperCase()
    const text = letter[2]!.trim()
    if (!text) return null
    return { key, label: optionLabel(key, text) }
  }
  const numbered = line.match(/^(\d{1,2})\s*[\)\.\:\-–—]\s*(.+)$/)
  if (numbered) {
    const key = String(Number(numbered[1]))
    const text = numbered[2]!.trim()
    if (!text || Number(key) < 1) return null
    return { key, label: optionLabel(key, text) }
  }
  const parenNum = line.match(/^\((\d{1,2})\)\s+(.+)$/)
  if (parenNum) {
    const key = String(Number(parenNum[1]))
    const text = parenNum[2]!.trim()
    if (!text || Number(key) < 1) return null
    return { key, label: optionLabel(key, text) }
  }
  return null
}

/**
 * Extrai as alternativas do enunciado (parser único, exerciseParse.ts): a partir de "A)" já é alternativa;
 * "I." e "II." do enunciado nunca viram alternativa.
 */
export function parseMcqFromContent(text: string): TrilhaOption[] | null {
  const parsed = parseExerciseContent(text)
  if (parsed.options.length < 2) return null
  return parsed.options.map((o) => ({ key: o.key, label: optionLabel(o.key, o.text) }))
}

/** Enunciado sem o bloco de alternativas (e sem a linha de gabarito). */
export function stripMcqFromContent(text: string, _options?: TrilhaOption[]): string {
  return parseExerciseContent(text).statement
}

/**
 * Resolve opções para o formulário: estruturado primeiro; senão parse do texto.
 */
export function resolveExerciseOptions(
  content: string | null | undefined,
  structured: unknown,
): { options: TrilhaOption[] | null; displayBody: string; answerKey: string | null } {
  const body = (content ?? '').trim()
  const answerKey = parseExerciseContent(body).answerKey
  const fromStruct = normalizeOptions(structured)
  if (fromStruct) {
    return { options: fromStruct, displayBody: stripMcqFromContent(body) || body, answerKey }
  }
  const fromText = parseMcqFromContent(body)
  if (fromText) {
    return {
      options: fromText,
      displayBody: stripMcqFromContent(body) || body,
      answerKey,
    }
  }
  return { options: null, displayBody: body, answerKey }
}
