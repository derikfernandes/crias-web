/**
 * Parser leve de opções MCQ a partir do campo `options` ou do texto do enunciado.
 * Submissão usa sempre a `key` (ex.: "A") — alinhado a `correct_option` no motor.
 */

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
  const m = line.match(/^([A-Da-d])\s*[\)\.\:\-–—]\s*(.+)$/)
  if (!m) return null
  const key = m[1]!.toUpperCase()
  const text = m[2]!.trim()
  if (!text) return null
  return { key, label: optionLabel(key, text) }
}

/**
 * Extrai A)/B)/C)… do enunciado quando `options` estruturado está vazio.
 * Suporta linhas e texto inline ("A) Lado B) Diagonal C) Ângulo").
 */
export function parseMcqFromContent(text: string): TrilhaOption[] | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  const lineHits: TrilhaOption[] = []
  for (const rawLine of trimmed.split(/\n+/)) {
    const line = rawLine.trim()
    if (!line) continue
    const parsed = parseSingleOptionLine(line)
    if (parsed) lineHits.push(parsed)
  }
  if (lineHits.length >= 2) {
    const keys = new Set(lineHits.map((o) => o.key))
    if (keys.size === lineHits.length) return lineHits
  }

  const inline: TrilhaOption[] = []
  const re =
    /(?:^|[\s\n])([A-Da-d])\s*[\)\.\:\-–—]\s*([\s\S]*?)(?=(?:\s+[A-Da-d]\s*[\)\.\:\-–—])|$)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(trimmed)) !== null) {
    const key = m[1]!.toUpperCase()
    const body = m[2]!.trim().replace(/\s+/g, ' ')
    if (!body) continue
    inline.push({ key, label: optionLabel(key, body) })
  }
  if (inline.length >= 2) {
    const keys = new Set(inline.map((o) => o.key))
    if (keys.size === inline.length) return inline
  }
  return null
}

/** Remove o bloco de alternativas do enunciado quando foram parseadas do texto. */
export function stripMcqFromContent(
  text: string,
  options: TrilhaOption[],
): string {
  let out = text
  for (const opt of options) {
    const key = escapeRegExp(opt.key)
    out = out.replace(
      new RegExp(
        `(?:^|[\\s\\n])${key}\\s*[\\)\\.\:\\-–—]\\s*[^\\n]*`,
        'gi',
      ),
      ' ',
    )
  }
  return out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * Resolve opções para o formulário: estruturado primeiro; senão parse do texto.
 */
export function resolveExerciseOptions(
  content: string | null | undefined,
  structured: unknown,
): { options: TrilhaOption[] | null; displayBody: string } {
  const body = (content ?? '').trim()
  const fromStruct = normalizeOptions(structured)
  if (fromStruct) {
    return { options: fromStruct, displayBody: body }
  }
  const fromText = parseMcqFromContent(body)
  if (fromText) {
    return {
      options: fromText,
      displayBody: stripMcqFromContent(body, fromText) || body,
    }
  }
  return { options: null, displayBody: body }
}
