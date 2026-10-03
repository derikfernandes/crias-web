/**
 * Guardrails para BLOCO RESPOSTA: fingerprint da questão + detecção de
 * conteúdo de outra disciplina (ex.: regência verbal em aula de diâmetro).
 */

import { createHash } from 'node:crypto'

/** Detecta stage AI pedagógico de feedback (BLOCO RESPOSTA / FINAL). */
export function isBlocoRespostaPrompt(
  prompt: string | null | undefined,
  title?: string | null,
): boolean {
  const p = (prompt ?? '').toUpperCase()
  const t = (title ?? '').toUpperCase()
  return (
    p.includes('BLOCO RESPOSTA') ||
    p.includes('OBJETIVO - BLOCO RESPOSTA') ||
    p.includes('BLOCO FINAL') ||
    p.includes('OBJETIVO - BLOCO FINAL') ||
    (t.includes('RESPOSTA') && !t.includes('PERGUNTA'))
  )
}

/** Tokens fortes de Linguagens/Português — não devem aparecer sem âncora no enunciado. */
const FOREIGN_LANG_RE =
  /\b(reg[eê]ncia(\s+verbal)?|preposi[cç][aã]o|verbo\s+gostar|gosta\s+de\s+nadar|ora[cç][aã]o|concord[aâ]ncia|crase|sujeito\s+oculto|objeto\s+direto|objeto\s+indireto|adjunto\s+adverbial|morfossintaxe|fonologia)\b/i

/** Tokens de Matemática geométrica comuns nestas trilhas. */
const MATH_GEO_RE =
  /\b(di[aâ]metro|raio|circunfer[eê]ncia|c[ií]rculo|per[ií]metro|área|ângulo|tri[aâ]ngulo|geometria)\b/i

export function contentFingerprint(parts: Array<string | null | undefined>): string {
  const joined = parts
    .map((p) => String(p ?? '').trim())
    .filter(Boolean)
    .join('\n---\n')
  return createHash('sha256').update(joined).digest('hex').slice(0, 32)
}

/** Extrai "letra B" / "alternativa A" do texto do BLOCO ou content base. */
export function extractCorrectLetterFromText(
  text: string | null | undefined,
): string | null {
  if (typeof text !== 'string' || !text.trim()) return null
  const patterns = [
    /resposta\s+correta\s+[eé]\s+a\s+letra\s*([A-Za-z])/i,
    /letra\s*([A-Za-z])\b/i,
    /alternativa\s*([A-Za-z])\b/i,
  ]
  for (const re of patterns) {
    const m = text.match(re)
    if (m?.[1]) return m[1].toUpperCase()
  }
  return null
}

/**
 * Monta CONTENT enriquecido para BLOCO RESPOSTA com o exercício anterior
 * (enunciado + opções + gabarito). Sem isso o gerador só vê "letra B".
 */
export function enrichBlocoContent(input: {
  blocoContent: string
  exerciseContent: string | null
  exerciseTitle?: string | null
  correctOption?: string | null
  correctLetter?: string | null
}): string {
  const bloco = String(input.blocoContent ?? '').trim()
  const exercise = String(input.exerciseContent ?? '').trim()
  if (!exercise) return bloco

  const letter =
    input.correctLetter ||
    (input.correctOption && /^[A-Za-z]$/.test(input.correctOption)
      ? input.correctOption.toUpperCase()
      : input.correctOption && /^\d+$/.test(input.correctOption)
        ? String.fromCharCode(64 + Number(input.correctOption))
        : null)

  const parts = [
    '=== EXERCÍCIO ANTERIOR (fonte de verdade do assunto) ===',
    input.exerciseTitle ? `Título: ${input.exerciseTitle}` : '',
    exercise,
    letter ? `GABARITO: letra ${letter}` : '',
    input.correctOption && input.correctOption !== letter
      ? `GABARITO (código): ${input.correctOption}`
      : '',
    '=== CONTEÚDO BASE DO BLOCO RESPOSTA ===',
    bloco || '(vazio — explique o gabarito do exercício acima)',
    'IMPORTANTE: Explique APENAS o exercício anterior. Não use exemplos de outra disciplina.',
  ]
  return parts.filter(Boolean).join('\n\n')
}

/**
 * True quando o texto gerado/cacheado parece de outra matéria
 * (ex.: regência verbal) sem âncora no enunciado do exercício.
 */
export function blocoMismatchesSubject(
  generatedText: string,
  subjectSource: string,
): boolean {
  const text = String(generatedText ?? '').trim()
  const subject = String(subjectSource ?? '').trim()
  if (!text) return false

  const hasForeign = FOREIGN_LANG_RE.test(text)
  if (!hasForeign) return false

  // Se o próprio enunciado/âncora já fala de regência etc., ok.
  if (FOREIGN_LANG_RE.test(subject)) return false

  // Em aula de geometria/math, foreign lang sem âncora = mismatch.
  if (MATH_GEO_RE.test(subject) || MATH_GEO_RE.test(text) === false) {
    // Foreign lang present, subject is math OR generated text has no math tokens
    // while subject looks like a real exercise → mismatch.
    if (MATH_GEO_RE.test(subject)) return true
    // Subject without math tokens but also without lang tokens: still reject
    // obvious Portuguese grammar dump when subject has no overlap.
    if (subject.length > 20 && !FOREIGN_LANG_RE.test(subject)) return true
  }

  return false
}

/**
 * Filtra CONTEXT para BLOCO: prioriza mesma question_number e células próximas;
 * remove linhas claramente de outra disciplina quando há âncora math.
 */
export function filterContextForBloco(
  context: string,
  opts: {
    stage_number: number
    question_number: number
    subjectSource: string
  },
): string {
  const lines = String(context ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return context

  const subjectIsMath = MATH_GEO_RE.test(opts.subjectSource)
  const q = opts.question_number
  const stage = opts.stage_number

  const scored = lines.map((line, idx) => {
    let score = 0
    const cell = line.match(/\[S(\d+)\s+Q(\d+)\]/i)
    if (cell) {
      const s = Number(cell[1])
      const qq = Number(cell[2])
      if (qq === q) score += 10
      if (Math.abs(s - stage) <= 2) score += 5
      if (Math.abs(s - stage) <= 4) score += 2
    }
    if (subjectIsMath && FOREIGN_LANG_RE.test(line)) score -= 50
    if (subjectIsMath && MATH_GEO_RE.test(line)) score += 3
    return { line, score, idx }
  })

  const kept = scored
    .filter((r) => r.score >= 0)
    .sort((a, b) => b.score - a.score || a.idx - b.idx)
    .slice(0, 12)
    .sort((a, b) => a.idx - b.idx)
    .map((r) => r.line)

  return kept.length > 0 ? kept.join('\n') : context
}
