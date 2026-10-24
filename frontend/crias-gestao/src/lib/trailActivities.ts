import type { TrailStageQuestion } from '../types/trailStageQuestion'
import { resolveExerciseOptions } from './trilha/exerciseOptions'
import { kindOfPhase, MAX_OPTIONS, MIN_OPTIONS, type StepKind } from './trailConfig'
import type { StructurePhase } from './trailEditor'

/**
 * Atividades de uma trilha (banco: `trail_stage_questions`, uma célula por etapa).
 * Atividade = `question_number`; etapa = `stage_number`. Uma atividade tem uma etapa
 * por posição da estrutura (conteúdo ou exercício).
 */

export type StepDraft = {
  stage: number
  kind: StepKind
  /** Título da etapa (só conteúdo). Vazio: usa o nome da etapa na estrutura. */
  title: string
  /** Conteúdo: texto. Exercício: enunciado, sem as alternativas. */
  content: string
  /** Só exercício: texto de cada alternativa, na ordem A, B, C... */
  options: string[]
  /** Só exercício: letra do gabarito ("" quando ainda não definido). */
  correct: string
}

export type ActivityDraft = {
  number: number
  title: string
  released: boolean
  steps: StepDraft[]
}

export const GENERIC_TITLE = /^(quest[aã]o|atividade|etapa)\s*\d+$/i

export function letterOf(index: number): string {
  return String.fromCharCode(65 + index)
}

/** Gabarito vindo do banco ("A", "1", "(B)", "B) texto") para letra maiúscula. */
export function correctToLetter(raw: string | null | undefined): string {
  if (!raw) return ''
  const t = String(raw).trim()
  if (!t) return ''
  const letter = /^\(?([A-Za-z])\)?(?:\s*[).:]|$)/.exec(t)
  if (letter) return letter[1].toUpperCase()
  const n = /^(\d{1,2})/.exec(t)
  if (n) {
    const idx = Number.parseInt(n[1], 10) - 1
    if (idx >= 0 && idx < 26) return letterOf(idx)
  }
  return ''
}

/** Título da atividade a partir do título gravado ("Etapa 1: Questão 1", legado com travessão, ou "Matemática"). */
export function activityTitleFromRow(raw: string, number: number): string {
  const stripped = raw
    .replace(/^(?:etapa|atividade|quest[aã]o)\s*\d+\s*(?:[:：]|—|-)\s*/i, '')
    .trim()
  const parts = raw.split(/\s+(?:—|-)\s+/)
  const fromDash = parts.length >= 2 ? parts.slice(1).join(' - ').trim() : ''
  const candidate = (stripped && stripped !== raw.trim() ? stripped : fromDash || raw).trim()
  if (!candidate || GENERIC_TITLE.test(candidate)) return `Atividade ${number}`
  return candidate
}

/** Título gravado em cada célula da atividade. */
export function storedActivityTitle(number: number, title: string): string {
  const t = title.trim()
  return t && !GENERIC_TITLE.test(t) ? `Atividade ${number}: ${t}` : `Atividade ${number}`
}

function stripKeyPrefix(label: string, key: string): string {
  return label.replace(new RegExp(`^${key}\\s*[).:\\-–—]\\s*`, 'i'), '').trim()
}

export function emptyStep(stage: number, kind: StepKind, optionCount: number): StepDraft {
  return {
    stage,
    kind,
    title: '',
    content: '',
    options: kind === 'e' ? Array.from({ length: optionCount }, () => '') : [],
    correct: '',
  }
}

export function stepFromRow(
  row: TrailStageQuestion | undefined,
  stage: number,
  kind: StepKind,
  optionCount: number,
): StepDraft {
  if (!row) return emptyStep(stage, kind, optionCount)
  if (kind === 'c') {
    return { stage, kind, title: '', content: row.content ?? '', options: [], correct: '' }
  }
  const resolved = resolveExerciseOptions(row.content, row.options)
  const options = (resolved.options ?? []).map((o) => stripKeyPrefix(o.label, o.key))
  const padded = options.length > 0 ? options : emptyStep(stage, 'e', optionCount).options
  return {
    stage,
    kind,
    title: '',
    content: resolved.displayBody,
    options: padded,
    correct: correctToLetter(row.correct_option),
  }
}

/** Agrupa as células do banco em atividades, da primeira para a última. */
export function activitiesFromRows(
  rows: TrailStageQuestion[],
  phases: StructurePhase[],
  optionCount: number,
): ActivityDraft[] {
  const byNumber = new Map<number, TrailStageQuestion[]>()
  for (const row of rows) {
    if (!row.active) continue
    const list = byNumber.get(row.question_number) ?? []
    list.push(row)
    byNumber.set(row.question_number, list)
  }
  const numbers = [...byNumber.keys()].sort((a, b) => a - b)
  return numbers.map((number) => {
    const group = byNumber.get(number) ?? []
    const byStage = new Map(group.map((r) => [r.stage_number, r]))
    const first = group[0]
    return {
      number,
      title: activityTitleFromRow(first?.title ?? '', number),
      released: group.some((r) => r.is_released),
      steps: phases.map((phase, i) =>
        stepFromRow(byStage.get(i + 1), i + 1, kindOfPhase(phase), optionCount),
      ),
    }
  })
}

/** Texto gravado no campo `content` de um exercício: enunciado e alternativas em linhas. */
export function composeExerciseContent(statement: string, options: string[]): string {
  const lines = options.map((text, i) => `${letterOf(i)}) ${text.trim()}`)
  return [statement.trim(), ...lines].filter(Boolean).join('\n')
}

/** Campos de uma célula (`trail_stage_questions`) a partir da etapa editada. */
export function cellFieldsFromStep(
  activity: Pick<ActivityDraft, 'number' | 'title' | 'released'>,
  step: StepDraft,
): Record<string, unknown> {
  const base = {
    stage_number: step.stage,
    question_number: activity.number,
    title: storedActivityTitle(activity.number, activity.title),
    is_released: activity.released,
    active: true,
  }
  if (step.kind === 'c') {
    return { ...base, content: step.content.trim(), correct_option: null, options: null }
  }
  const letters = step.options.map((_, i) => letterOf(i))
  return {
    ...base,
    content: composeExerciseContent(step.content, step.options),
    correct_option: step.correct && letters.includes(step.correct) ? step.correct : null,
    options: step.options.map((text, i) => ({ key: letterOf(i), text: text.trim() })),
  }
}

/** Etapa completa: conteúdo com texto; exercício com enunciado e todas as alternativas. */
export function stepIsComplete(step: StepDraft): boolean {
  if (!step.content.trim()) return false
  if (step.kind === 'c') return true
  return step.options.length >= MIN_OPTIONS && step.options.every((o) => o.trim() !== '')
}

export function activityIsComplete(activity: ActivityDraft): boolean {
  return activity.steps.every(stepIsComplete)
}

export function blankActivity(
  number: number,
  phases: StructurePhase[],
  optionCount: number,
  title = '',
): ActivityDraft {
  return {
    number,
    title: title || `Atividade ${number}`,
    released: false,
    steps: phases.map((p, i) => emptyStep(i + 1, kindOfPhase(p), optionCount)),
  }
}

/** Posição do exercício entre os exercícios da atividade ("Exercício X de Y"). */
export function exercisePosition(
  steps: Array<Pick<StepDraft, 'kind'>>,
  index: number,
): { position: number; total: number } {
  let position = 0
  let total = 0
  steps.forEach((s, i) => {
    if (s.kind === 'e') {
      total += 1
      if (i <= index) position += 1
    }
  })
  return { position, total }
}

/** Nome padrão de uma etapa na lista: "Conteúdo" ou "Exercício X de Y". */
export function stepLabel(steps: StepDraft[], index: number): string {
  const s = steps[index]
  if (s.kind === 'c') return s.title.trim() || 'Conteúdo'
  const { position, total } = exercisePosition(steps, index)
  return `Exercício ${position} de ${total}`
}

export function clampOptionCount(n: number): number {
  return Math.max(MIN_OPTIONS, Math.min(MAX_OPTIONS, Math.round(n)))
}

/* ===== Planilha de atividades (modelo, leitura e adição) ===== */

export const SHEET_TEMPLATE = 'ConteudosModelo'
export const SHEET_INSTRUCTIONS = 'Instrucoes'

export type SheetError = { row: number; field: string; message: string }

export type SheetParse = {
  totalRows: number
  activities: ActivityDraft[]
  errors: SheetError[]
}

export function templateHeaders(phases: StructurePhase[]): string[] {
  const headers = ['Atividade']
  phases.forEach((p, i) => {
    headers.push(`Etapa ${i + 1}`)
    if (p.stage_type === 'exercise') headers.push(`Gabarito ${i + 1}`)
  })
  return headers
}

export function templateRows(
  phases: StructurePhase[],
  optionCount: number,
  count = 3,
): string[][] {
  const letters = Array.from({ length: optionCount }, (_, i) => letterOf(i))
  return Array.from({ length: count }, (_, r) => {
    const row: string[] = [`Atividade ${r + 1}`]
    phases.forEach((p) => {
      if (p.stage_type === 'exercise') {
        row.push(
          ['Enunciado do exercício', ...letters.map((l) => `${l}) Alternativa ${l}`)].join('\n'),
        )
        row.push(letters[0])
      } else {
        row.push('Texto do conteúdo desta etapa')
      }
    })
    return row
  })
}

export function instructionRows(phases: StructurePhase[], optionCount: number): string[][] {
  const last = letterOf(optionCount - 1)
  return [
    ['Campo', 'Como preencher'],
    ['Atividade', 'Nome da atividade. A numeração é automática: as atividades da planilha entram depois das que já existem.'],
    ['Etapa N (conteúdo)', 'Texto da etapa. Obrigatório.'],
    ['Etapa N (exercício)', `Enunciado e uma alternativa por linha, de A) até ${last}). São ${optionCount} alternativas.`],
    ['Gabarito N', `Letra da alternativa correta, de A até ${last}. Opcional: pode ser definido depois na aba Gabarito.`],
    ['Estrutura', phases.map((p, i) => `${i + 1}: ${p.stage_type === 'exercise' ? 'Exercício' : 'Conteúdo'}`).join(' | ')],
    ['Importante', 'Importar sempre ADICIONA atividades. Nada que já existe é substituído ou apagado.'],
  ]
}

const cell = (v: unknown): string => {
  if (v === null || v === undefined) return ''
  return typeof v === 'string' ? v.trim() : String(v).trim()
}

/** Lê as linhas da planilha. Aceita também os cabeçalhos antigos ("Etapa" e "Fase N"). */
export function parseActivitySheet(
  rawRows: Array<Record<string, unknown>>,
  phases: StructurePhase[],
  optionCount: number,
): SheetParse {
  const errors: SheetError[] = []
  const activities: ActivityDraft[] = []
  const legacy = rawRows.length > 0 && Object.keys(rawRows[0] ?? {}).some((k) => /^fase\s*\d+$/i.test(k.trim()))

  rawRows.forEach((raw, idx) => {
    const rowNumber = idx + 2
    const get = (name: string) => {
      const key = Object.keys(raw).find((k) => k.trim().toLowerCase() === name.toLowerCase())
      return key === undefined ? '' : cell(raw[key])
    }
    const blank = Object.values(raw).every((v) => cell(v) === '')
    if (blank) return

    const label = legacy ? '' : get('Atividade')
    const steps: StepDraft[] = []
    let bad = false
    phases.forEach((phase, i) => {
      const n = i + 1
      const body = legacy ? get(`Fase ${n}`) : get(`Etapa ${n}`)
      const field = legacy ? `Fase ${n}` : `Etapa ${n}`
      if (phase.stage_type !== 'exercise') {
        if (!body) {
          errors.push({ row: rowNumber, field, message: 'Etapa de conteúdo sem texto.' })
          bad = true
        }
        steps.push({ stage: n, kind: 'c', title: '', content: body, options: [], correct: '' })
        return
      }
      if (!body) {
        errors.push({ row: rowNumber, field, message: 'Exercício sem enunciado.' })
        bad = true
        steps.push(emptyStep(n, 'e', optionCount))
        return
      }
      const parsed = resolveExerciseOptions(body, null)
      const options = (parsed.options ?? []).map((o) => stripKeyPrefix(o.label, o.key))
      const statement = parsed.displayBody
      if (options.length !== optionCount) {
        errors.push({
          row: rowNumber,
          field,
          message: `O exercício precisa de ${optionCount} alternativas (A a ${letterOf(optionCount - 1)}); a planilha tem ${options.length}.`,
        })
        bad = true
      }
      const correct = correctToLetter(get(`Gabarito ${n}`))
      if (get(`Gabarito ${n}`) && (!correct || correct.charCodeAt(0) - 65 >= optionCount)) {
        errors.push({ row: rowNumber, field: `Gabarito ${n}`, message: 'Gabarito fora das alternativas.' })
        bad = true
      }
      steps.push({ stage: n, kind: 'e', title: '', content: statement, options, correct })
    })
    if (bad) return
    activities.push({ number: 0, title: label, released: false, steps })
  })

  return { totalRows: rawRows.length, activities, errors }
}

/** Dá os próximos números às atividades novas, depois da última que já existe. */
export function numberAfter(
  existing: Array<Pick<ActivityDraft, 'number'>>,
  incoming: ActivityDraft[],
): ActivityDraft[] {
  const last = existing.reduce((max, a) => Math.max(max, a.number), 0)
  return incoming.map((a, i) => ({
    ...a,
    number: last + i + 1,
    title: a.title.trim() || `Atividade ${last + i + 1}`,
  }))
}
