import type { Trail } from '../types/trail'
import type { TrailStage } from '../types/trailStage'
import {
  structurePhasesFromTrailData,
  type StructurePhase,
} from './trailEditor'

/**
 * Configuração de uma trilha (INTERFACE.md 1.1.9 e 1.1.10): objetivo, estrutura
 * (conteúdos e exercícios, em ordem), alternativas, orientações. Só a estrutura se
 * grava, nos campos que já existem (`phase_blueprint`, `trail_stages`). Objetivo,
 * orientações e alternativas valem só na tela e no envio à IA (nada novo no banco).
 */

export const OBJECTIVES = [
  'Reforço',
  'Revisão',
  'Recomposição',
  'Avaliação',
  'Preparatório',
  'Simulado',
  'Recuperação',
  'Progressão',
] as const
export const DEFAULT_OBJECTIVE = 'Reforço'

export type DepthId = 'baixa' | 'media' | 'alta' | 'custom'
export type StepKind = 'c' | 'e'

/** Profundidade: [id, rótulo, conteúdos, exercícios]. Padrão: Média 5+2. */
export const DEPTHS: Array<[Exclude<DepthId, 'custom'>, string, number, number]> = [
  ['baixa', 'Baixa', 3, 1],
  ['media', 'Média', 5, 2],
  ['alta', 'Alta', 8, 3],
]
export const MAX_CONTENTS = 12
export const MAX_EXERCISES = 6
export const MIN_OPTIONS = 2
export const MAX_OPTIONS = 6
export const DEFAULT_OPTIONS = 4
export const MAX_ACTIVITIES = 60

/** Conteúdos primeiro, exercícios por último. */
export function defaultOrder(contents: number, exercises: number): StepKind[] {
  return [
    ...Array<StepKind>(Math.max(0, contents)).fill('c'),
    ...Array<StepKind>(Math.max(0, exercises)).fill('e'),
  ]
}

export type StructureConfig = {
  depth: DepthId
  contents: number
  exercises: number
  /** Ordem das etapas; só vale em "custom". */
  order: StepKind[]
  options: number
}

export const DEFAULT_STRUCTURE: StructureConfig = {
  depth: 'media',
  contents: 5,
  exercises: 2,
  order: defaultOrder(5, 2),
  options: DEFAULT_OPTIONS,
}

/** Ordem efetiva: nas profundidades prontas é a padrão; em "custom", a escolhida. */
export function effectiveOrder(cfg: StructureConfig): StepKind[] {
  if (cfg.depth === 'custom') {
    return cfg.order.length > 0 ? cfg.order : defaultOrder(cfg.contents, cfg.exercises)
  }
  const preset = DEPTHS.find((d) => d[0] === cfg.depth) ?? DEPTHS[1]
  return defaultOrder(preset[2], preset[3])
}

export function counts(order: StepKind[]): { contents: number; exercises: number } {
  const exercises = order.filter((k) => k === 'e').length
  return { contents: order.length - exercises, exercises }
}

export function structureTotalLabel(order: StepKind[]): string {
  return `${order.length} etapa${order.length === 1 ? '' : 's'} por atividade`
}

/** Troca a quantidade de conteúdos e exercícios, voltando a uma profundidade pronta quando combinar. */
export function withCounts(
  cfg: StructureConfig,
  contents: number,
  exercises: number,
): StructureConfig {
  const c = Math.max(1, Math.min(MAX_CONTENTS, contents))
  const e = Math.max(1, Math.min(MAX_EXERCISES, exercises))
  const preset = DEPTHS.find((d) => d[2] === c && d[3] === e)
  if (preset && cfg.depth !== 'custom') {
    return { ...cfg, depth: preset[0], contents: c, exercises: e, order: defaultOrder(c, e) }
  }
  return { ...cfg, depth: 'custom', contents: c, exercises: e, order: defaultOrder(c, e) }
}

export function withDepth(cfg: StructureConfig, depth: DepthId): StructureConfig {
  if (depth === 'custom') {
    const base = DEPTHS.find((d) => d[0] === cfg.depth) ?? DEPTHS[1]
    return {
      ...cfg,
      depth,
      contents: base[2],
      exercises: base[3],
      order: defaultOrder(base[2], base[3]),
    }
  }
  const preset = DEPTHS.find((d) => d[0] === depth) ?? DEPTHS[1]
  return {
    ...cfg,
    depth,
    contents: preset[2],
    exercises: preset[3],
    order: defaultOrder(preset[2], preset[3]),
  }
}

export function moveStep(order: StepKind[], from: number, to: number): StepKind[] {
  if (to < 0 || to >= order.length || from === to) return order
  const next = order.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

/**
 * Tipos de bloco de conteúdo que o prompt gerador reconhece (geradorSystemPrompt.ts, item 5.2).
 * O texto ao aluno é sempre gerado por IA (personalização); o comando do bloco diz ao gerador qual tipo escrever.
 */
const BLOCK_COMMANDS: Record<string, [string, string]> = {
  intro: ['Introdução', 'Nomeie e defina os conceitos centrais do conteúdo base, em linguagem simples, sem aprofundar.'],
  explain: ['Explicação', 'Desenvolva os conceitos do conteúdo base e mostre como eles se relacionam.'],
  example: ['Exemplo prático', 'Aplique o conteúdo base em uma situação concreta, com o raciocínio passo a passo.'],
  deepen: ['Aprofundamento', 'Avance em nuances, variações e exceções do conteúdo base.'],
  conclusion: ['Conclusão', 'Sintetize os pontos principais do conteúdo base, sem apresentar conceito novo.'],
}

/** Tipo de bloco de cada conteúdo, pela posição (1ª Introdução, última Conclusão quando há 3 ou mais). */
function contentKinds(total: number): string[] {
  if (total <= 1) return ['intro']
  if (total === 2) return ['intro', 'explain']
  const middle = ['explain', 'example', 'deepen']
  const kinds = ['intro']
  for (let i = 0; i < total - 2; i++) kinds.push(middle[i % middle.length])
  kinds.push('conclusion')
  return kinds
}

/**
 * Etapas da estrutura no formato que o banco usa (`phase_blueprint` e `trail_stages`).
 * Conteúdo nasce sempre como IA, com título e comando do bloco pelo tipo. Com `existing` (trilha já salva),
 * a etapa da mesma posição e do mesmo tipo (conteúdo ou exercício) mantém título, tipo e comando.
 */
export function phasesFromConfig(cfg: StructureConfig, existing?: StructurePhase[]): StructurePhase[] {
  const order = effectiveOrder(cfg)
  const kinds = contentKinds(order.filter((k) => k === 'c').length)
  let c = 0
  let e = 0
  return order.map((k, i) => {
    const old = existing?.[i]
    if (k === 'c') {
      const [title, command] = BLOCK_COMMANDS[kinds[c]]
      c += 1
      if (old && old.stage_type !== 'exercise') {
        const keepsCommand = old.stage_type !== 'ai' || old.prompt.trim() !== ''
        return { id: `bp-${i + 1}`, title: old.title, stage_type: old.stage_type, prompt: keepsCommand ? old.prompt : command }
      }
      return { id: `bp-${i + 1}`, title, stage_type: 'ai' as const, prompt: command }
    }
    e += 1
    if (old && old.stage_type === 'exercise') return { id: `bp-${i + 1}`, title: old.title, stage_type: 'exercise' as const, prompt: '' }
    return { id: `bp-${i + 1}`, title: `Exercício ${e}`, stage_type: 'exercise' as const, prompt: '' }
  })
}

export function kindOfPhase(phase: Pick<StructurePhase, 'stage_type'>): StepKind {
  return phase.stage_type === 'exercise' ? 'e' : 'c'
}

/** Lê a configuração de uma trilha já salva. Etapas 'ai' e 'fixed' contam como conteúdo. `options` vem do exercício existente. */
export function configFromTrail(
  trail: Pick<Trail, 'phase_blueprint'>,
  stages: TrailStage[],
  options: number = DEFAULT_OPTIONS,
): StructureConfig {
  const phases = structurePhasesFromTrailData(trail.phase_blueprint, stages)
  const order = phases.map(kindOfPhase)
  const { contents, exercises } = counts(order)
  const preset = DEPTHS.find(
    (d) =>
      d[2] === contents &&
      d[3] === exercises &&
      order.every((k, i) => k === defaultOrder(d[2], d[3])[i]),
  )
  return {
    depth: preset ? preset[0] : 'custom',
    contents,
    exercises,
    order,
    options: Math.max(MIN_OPTIONS, Math.min(MAX_OPTIONS, options)),
  }
}

/** Letras de A até a última alternativa (2 a 6). */
export function optionLetters(count: number): string[] {
  const n = Math.max(MIN_OPTIONS, Math.min(MAX_OPTIONS, count))
  return Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i))
}

/** Título automático "Exercício X de Y" pela posição entre os exercícios da atividade. */
export function exerciseTitle(position: number, total: number): string {
  return `Exercício ${position} de ${total}`
}

export type GenerationConfig = {
  name: string
  subject: string
  description: string
  objective: string
  contents: number
  exercises: number
  order: StepKind[]
  activities: number
  options: number
  skills: string
  guidelines: string
  /** Texto dos arquivos anexados (já extraído). */
  filesText: string
}

/** Campo vazio vai como "N/A" (1.1.9). */
export function orNA(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A'
  const s = String(value).trim()
  return s ? s : 'N/A'
}

/** Resumo legível da Configuração de geração, na ordem em que aparece na Prévia. */
export function generationSummary(cfg: GenerationConfig): Array<{ k: string; v: string }> {
  return [
    { k: 'Nome', v: orNA(cfg.name) },
    { k: 'Matéria', v: orNA(cfg.subject) },
    { k: 'Descrição', v: orNA(cfg.description) },
    { k: 'Objetivo', v: orNA(cfg.objective) },
    { k: 'Conteúdos', v: orNA(cfg.contents) },
    { k: 'Exercícios', v: orNA(cfg.exercises) },
    {
      k: 'Ordem',
      v: cfg.order.map((s) => (s === 'c' ? 'Conteúdo' : 'Exercício')).join(', ') || 'N/A',
    },
    { k: 'Atividades', v: orNA(cfg.activities) },
    { k: 'Alternativas', v: orNA(cfg.options) },
    { k: 'Habilidades', v: orNA(cfg.skills) },
    { k: 'Orientações', v: orNA(cfg.guidelines) },
    { k: 'Arquivos', v: cfg.filesText.trim() ? 'Enviados' : 'N/A' },
  ]
}
