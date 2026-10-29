/**
 * Separação única de exercício: enunciado, alternativas e gabarito (pacote 1.2.5).
 * Espelhos idênticos (testados por paridade):
 *   - frontend/crias-aluno/src/lib/exerciseParse.ts
 *   - frontend/crias-gestao/src/lib/trilha/exerciseParse.ts
 *
 * REGRA (Thiago, 28/10/2026)
 *  1. A partir da linha "A)" (ou "A.", "A:", "A -", "(A)", "a)", "**A)**") já é alternativa.
 *  2. O que está acima da primeira alternativa é o enunciado. Linhas como "I. ..." e "II. ..." no
 *     enunciado nunca viram alternativa e nunca são apagadas.
 *  3. Cada alternativa ocupa uma linha da interface; linha que continua a alternativa é juntada a ela.
 *  4. O gabarito pode vir (a) abaixo das alternativas ("Gabarito: B", "Resposta correta: B") ou (b) na
 *     mensagem seguinte, o feedback ("A resposta é A", "A resposta correta é a letra B"). Ele é
 *     registrado no sistema e nunca aparece no texto nem como alternativa.
 */

export type ParsedOption = {
  /** "A", "B"... (ou "1", "2"... quando a lista é numerada). */
  key: string
  /** Texto da alternativa, sem o marcador. */
  text: string
}

export type ParsedExercise = {
  /** Tudo acima da primeira alternativa (mais o que sobrar depois do bloco, sem o gabarito). */
  statement: string
  options: ParsedOption[]
  /** Gabarito lido abaixo das alternativas ("Gabarito: B"), ou null. */
  answerKey: string | null
  style: 'letter' | 'number' | null
}

const BOLD = String.raw`(?:\*\*|__)?`
// "A)", "(A)", "A.", "A:", "A -" (letra) e "1)", "(1)", "1.", "1:" (número).
const LETTER_MARKER = new RegExp(
  String.raw`^\s*(?:[-*•>]\s*)?${BOLD}(?:\(([A-Za-z])\)|([A-Za-z])\)|([A-Za-z])[.:](?=\s)|([A-Za-z])\s[-–—](?=\s))${BOLD}\s*(.*)$`,
)
const NUMBER_MARKER = new RegExp(
  String.raw`^\s*(?:[-*•>]\s*)?${BOLD}(?:\((\d{1,2})\)|(\d{1,2})\)|(\d{1,2})[.:](?=\s))${BOLD}\s*(.*)$`,
)

type Marker = { key: string; text: string }

function matchMarker(line: string, style: 'letter' | 'number'): Marker | null {
  const m = (style === 'letter' ? LETTER_MARKER : NUMBER_MARKER).exec(line)
  if (!m) return null
  const groups = style === 'letter' ? m.slice(1, 5) : m.slice(1, 4)
  const raw = groups.find((g) => g !== undefined)
  if (!raw) return null
  const text = (m[style === 'letter' ? 5 : 4] ?? '').replace(/(?:\*\*|__)\s*$/, '').trim()
  return { key: style === 'letter' ? raw.toUpperCase() : String(Number(raw)), text }
}

function keyAt(style: 'letter' | 'number', index: number): string {
  return style === 'letter' ? String.fromCharCode(65 + index) : String(index + 1)
}

/** Linha de gabarito: "Gabarito: B", "Resposta correta: B", "Alternativa correta: B"... */
const ANSWER_LINE =
  /^\s*(?:[-*•>]\s*)?(?:\*\*|__|✅|✔️|📌|💡|🔑)?\s*(?:a\s+)?(?:gabarito|resposta(?:\s+(?:correta|certa))?|alternativa\s+(?:correta|certa)|op[cç][aã]o\s+(?:correta|certa)|resp\.?)\s*(?:oficial\s*)?(?:[:：=\-–—]|\s[ée]\s)/i
const STRICT_ANSWER_LINE = /^\s*(?:[-*•>]\s*)?(?:\*\*|__|✅|✔️|📌|💡|🔑)?\s*gabarito\b/i

function isAnswerLine(line: string): boolean {
  return ANSWER_LINE.test(line)
}

type Block = { options: ParsedOption[]; start: number; end: number; answer: string | null; prefix?: string }

/** Procura o bloco de alternativas a partir da primeira linha "A)" (ou "1)") que tenha B (ou 2) depois. */
function findBlock(lines: string[], style: 'letter' | 'number'): Block | null {
  for (let i = 0; i < lines.length; i++) {
    const first = matchMarker(lines[i], style)
    if (!first || first.key !== keyAt(style, 0)) continue

    const options: ParsedOption[] = [{ key: first.key, text: first.text }]
    let answer: string | null = null
    let end = i
    let sawBlank = false
    let restarted = false
    for (let j = i + 1; j < lines.length; j++) {
      const line = lines[j]
      if (!line.trim()) {
        sawBlank = true
        continue
      }
      const mk = matchMarker(line, style)
      if (mk && mk.key === first.key && options.length === 1) {
        // Outro "A)" antes do "B)": o primeiro era texto do enunciado; recomeça a partir deste.
        restarted = true
        break
      }
      if (mk && mk.key === keyAt(style, options.length)) {
        options.push({ key: mk.key, text: mk.text })
        end = j
        sawBlank = false
        continue
      }
      if (isAnswerLine(line)) {
        answer = extractAnswerKey(line)
        end = j
        sawBlank = false
        // A zona do gabarito pode ter mais linhas dele; segue lendo para removê-las.
        continue
      }
      // Linha que não é alternativa nem gabarito: continua a alternativa anterior (sem linha em branco
      // no meio). Depois de uma linha em branco é outro parágrafo, e o bloco termina aqui.
      if (sawBlank) break
      const last = options[options.length - 1]
      last.text = `${last.text} ${line.trim()}`.trim()
      end = j
    }
    if (!restarted && options.length >= 2 && options.every((o) => o.text.length > 0)) {
      return { options, start: i, end, answer }
    }
  }
  return null
}

/** Alternativas na mesma linha: "A) um B) dois C) três". */
function findInline(lines: string[]): Block | null {
  const re = /(?:^|\s)\(?([A-Ja-j])\)\s+/g
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const hits: Array<{ key: string; index: number; len: number }> = []
    let m: RegExpExecArray | null
    re.lastIndex = 0
    while ((m = re.exec(line)) !== null) {
      hits.push({ key: m[1].toUpperCase(), index: m.index, len: m[0].length })
    }
    if (hits.length < 2 || hits[0].key !== 'A') continue
    if (!hits.every((h, k) => h.key === keyAt('letter', k))) continue
    const options = hits.map((h, k) => {
      const from = h.index + h.len
      const to = k + 1 < hits.length ? hits[k + 1].index : line.length
      return { key: h.key, text: line.slice(from, to).trim() }
    })
    if (options.some((o) => !o.text)) continue
    return { options, start: i, end: i, answer: null, prefix: line.slice(0, hits[0].index).trim() }
  }
  return null
}

export function parseExerciseContent(raw: string | null | undefined): ParsedExercise {
  const content = typeof raw === 'string' ? raw.replace(/\r\n?/g, '\n') : ''
  const lines = content.split('\n')

  let style: 'letter' | 'number' | null = null
  let block = findBlock(lines, 'letter')
  if (block) style = 'letter'
  else {
    block = findBlock(lines, 'number')
    if (block) style = 'number'
  }
  if (!block) {
    block = findInline(lines)
    if (block) style = 'letter'
  }
  const prefix = block?.prefix ?? ''

  // "Gabarito: X" nunca aparece para o aluno, mesmo quando as alternativas não foram achadas.
  const cleanedAnswer: { key: string | null } = { key: null }
  const dropStrict = (l: string) => {
    if (!STRICT_ANSWER_LINE.test(l)) return true
    cleanedAnswer.key ??= extractAnswerKey(l)
    return false
  }

  if (!block) {
    const kept = lines.filter(dropStrict)
    return {
      statement: tidy(kept.join('\n')),
      options: [],
      answerKey: cleanedAnswer.key,
      style: null,
    }
  }

  const head = lines.slice(0, block.start)
  if (prefix) head.push(prefix)
  const tail: string[] = []
  let answer = block.answer
  for (let j = block.end + 1; j < lines.length; j++) {
    const line = lines[j]
    if (isAnswerLine(line)) {
      answer ??= extractAnswerKey(line)
      continue
    }
    tail.push(line)
  }
  const statement = tidy([...head, ...tail].filter(dropStrict).join('\n'))
  return { statement, options: block.options, answerKey: answer ?? cleanedAnswer.key, style }
}

function tidy(text: string): string {
  return text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

/* ===== Gabarito ===== */

const KEY = String.raw`([A-Ja-j]|\d{1,2})`
const CHOICE_WORD = String.raw`(?:letra|alternativa|op[cç][aã]o)`
const QUOTE = String.raw`["“”'‘’]?`
const AFTER = String.raw`(?![\p{L}\d])`
const KEY_TAIL = String.raw`[\s*_]*${QUOTE}\(?\*{0,2}${KEY}\*{0,2}\)?${QUOTE}${AFTER}`
const VERB = String.raw`(?:[ée]|era|seria|foi|ser[áa])`

const ANSWER_PATTERNS: RegExp[] = [
  // Gabarito: B | Gabarito é a letra B | Gabarito oficial: B
  new RegExp(String.raw`\bgabarito\b\s*(?:oficial\b\s*)?(?:[:：=\-–—]|${VERB})?\s*(?:a\s+)?(?:${CHOICE_WORD}\s*)?[:\-–—]?${KEY_TAIL}`, 'giud'),
  // A resposta correta é B | A alternativa certa é a letra B | Resposta correta: B
  new RegExp(String.raw`\b(?:resposta|alternativa|op[cç][aã]o|letra)\s+(?:correta|certa|certeira|esperada)\s*(?:${VERB}|[:：=\-–—])?\s*(?:a\s+)?(?:${CHOICE_WORD}\s*)?[:\-–—]?${KEY_TAIL}`, 'giud'),
  // A resposta é A | A resposta é a letra B | Resposta: B
  new RegExp(String.raw`\bresposta\s*(?:${VERB}|[:：=\-–—])\s*(?:a\s+)?(?:${CHOICE_WORD}\s*)?[:\-–—]?${KEY_TAIL}`, 'giud'),
  // Resp.: B
  new RegExp(String.raw`\bresp\.\s*[:：=\-–—]?${KEY_TAIL}`, 'giud'),
  // A correta é a letra C | A certa é a B
  new RegExp(String.raw`\b(?:a\s+)?(?:correta|certa)\s+${VERB}\s+(?:a\s+)?(?:${CHOICE_WORD}\s*)?[:\-–—]?${KEY_TAIL}`, 'giud'),
  // A letra B é a correta | A alternativa C é a resposta certa
  new RegExp(String.raw`\b${CHOICE_WORD}\s*${QUOTE}\(?\*{0,2}${KEY}\*{0,2}\)?${QUOTE}\s+${VERB}\s+(?:a\s+)?(?:resposta\s+|alternativa\s+|op[cç][aã]o\s+)?(?:correta|certa)\b`, 'giud'),
  // (B) é a correta | B) é a resposta correta
  new RegExp(String.raw`(?:^|[\s(])\(?\*{0,2}${KEY}\*{0,2}\)\s+${VERB}\s+(?:a\s+)?(?:resposta\s+|alternativa\s+|op[cç][aã]o\s+)?(?:correta|certa)\b`, 'giud'),
]

/**
 * Número só vale como chave de lista numerada quando vem depois de "gabarito", "letra", "alternativa" ou "opção"
 * ("A resposta é 12 metros" não é a alternativa 12).
 */
function numberAllowed(text: string, keyIndex: number): boolean {
  const before = text.slice(Math.max(0, keyIndex - 24), keyIndex)
  return /(?:gabarito|letra|alternativa|op[cç][aã]o)\s*[:=\-–—]?\s*["“'‘(*]*$/i.test(before)
}

/**
 * Letra minúscula só vale com a palavra letra/alternativa/opção logo antes, ou entre parênteses/negrito/aspas.
 * Evita ler o artigo "a" de "a resposta é a mais simples" como alternativa A.
 */
function lowercaseAllowed(text: string, keyIndex: number): boolean {
  const before = text.slice(Math.max(0, keyIndex - 24), keyIndex)
  return /(?:letra|alternativa|op[cç][aã]o)\s*[:\-–—]?\s*["“'‘(*]*$/i.test(before) || /["“'‘(*]$/.test(before)
}

/**
 * Lê o gabarito de um texto: "Gabarito: B", "A resposta é A", "A resposta correta é a letra B",
 * "A letra C é a correta"... Devolve a chave ("B", ou "2" em lista numerada) ou null.
 * Só vale afirmação explícita sobre a resposta correta: "a alternativa A está errada" não conta.
 * Com respostas diferentes no mesmo texto, devolve null (ambíguo).
 */
export function extractAnswerKey(text: string | null | undefined, opts?: { allowBare?: boolean }): string | null {
  if (typeof text !== 'string' || !text.trim()) return null
  const found = new Set<string>()
  for (const re of ANSWER_PATTERNS) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      const idx = (m as unknown as { indices?: Array<[number, number] | undefined> }).indices?.[1]
      if (!idx) continue
      const raw = text.slice(idx[0], idx[1])
      if (/^[a-j]$/.test(raw) && !lowercaseAllowed(text, idx[0])) continue
      if (/^\d+$/.test(raw) && !numberAllowed(text, idx[0])) continue
      found.add(/^\d+$/.test(raw) ? String(Number(raw)) : raw.toUpperCase())
    }
  }
  if (found.size === 1) return [...found][0]
  if (found.size > 1) return null
  if (opts?.allowBare) {
    const bare = /^\s*(?:(?:letra|alternativa|op[cç][aã]o)\s*)?\(?\*{0,2}([A-Ja-j]|\d{1,2})\*{0,2}\)?\.?\s*$/i.exec(text)
    if (bare && text.trim().length <= 24) return /^\d+$/.test(bare[1]) ? String(Number(bare[1])) : bare[1].toUpperCase()
  }
  return null
}
