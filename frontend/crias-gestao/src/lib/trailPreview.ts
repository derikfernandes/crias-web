import { stepLabel, letterOf, type ActivityDraft } from './trailActivities'

/**
 * Prévia da trilha em lista com Resumo (INTERFACE.md 1.1.1.b.41 a 1.1.1.b.43). Tudo calculado só no frontend.
 * Blocos: c = conteúdo, e = exercício, f = feedback (acompanha o exercício), k = conclusão (fica no fim).
 */
export type BlockKind = 'c' | 'e' | 'f' | 'k'

export type PreviewOptions = {
  /** Feedback instantâneo depois de cada exercício. */
  feedback: boolean
  /** Etapa conclusiva no fim da atividade. */
  conclusive: boolean
}

export const BLOCK_LABEL: Record<BlockKind, string> = { c: 'Conteúdo', e: 'Exercício', f: 'Feedback', k: 'Conclusão' }

export type PreviewBlock = {
  /** "B1", "B2"... */
  id: string
  kind: BlockKind
  title: string
  body: string
  options: string[]
  correct: string
}

const FEEDBACK_BODY = 'Informa se a resposta está correta e explica o porquê. Gerado pela IA quando o aluno responde.'
const CONCLUSION_BODY = 'Sintetiza os pontos principais da atividade, sem conceito novo. Gerada pela IA.'

/** Blocos de uma atividade na ordem do aluno: o feedback vem logo após o exercício e a conclusão fica no fim. */
export function previewBlocks(activity: ActivityDraft, opts: PreviewOptions): PreviewBlock[] {
  const out: Omit<PreviewBlock, 'id'>[] = []
  activity.steps.forEach((st, i) => {
    if (st.kind === 'e') {
      out.push({ kind: 'e', title: stepLabel(activity.steps, i), body: st.content, options: st.options.filter(Boolean), correct: st.correct })
      if (opts.feedback) out.push({ kind: 'f', title: 'Feedback', body: FEEDBACK_BODY, options: [], correct: '' })
    } else {
      out.push({ kind: 'c', title: stepLabel(activity.steps, i), body: st.content, options: [], correct: '' })
    }
  })
  if (opts.conclusive) out.push({ kind: 'k', title: 'Conclusão', body: CONCLUSION_BODY, options: [], correct: '' })
  return out.map((b, i) => ({ ...b, id: `B${i + 1}` }))
}

/** 1 min por bloco de conteúdo, feedback ou conclusão e 2 min por exercício. */
export function estimateMinutes(kinds: BlockKind[]): number {
  return kinds.reduce((sum, k) => sum + (k === 'e' ? 2 : 1), 0)
}

export type PreviewSummary = {
  activities: number
  /** Exercícios no total, em todas as atividades. */
  exercises: number
  /** Por atividade (da primeira). */
  contents: number
  exercisesPerActivity: number
  minutes: number
  feedback: boolean
  conclusive: boolean
}

export function previewSummary(activities: ActivityDraft[], opts: PreviewOptions): PreviewSummary {
  const first = activities[0] ? previewBlocks(activities[0], opts) : []
  const kinds = first.map((b) => b.kind)
  return {
    activities: activities.length,
    exercises: activities.reduce((n, a) => n + a.steps.filter((s) => s.kind === 'e').length, 0),
    contents: kinds.filter((k) => k === 'c').length,
    exercisesPerActivity: kinds.filter((k) => k === 'e').length,
    minutes: estimateMinutes(kinds),
    feedback: kinds.includes('f'),
    conclusive: kinds.includes('k'),
  }
}

/** Alternativa em uma linha: "A) texto ✓". */
export function optionLine(block: PreviewBlock, index: number): string {
  return `${letterOf(index)}) ${block.options[index]}${block.correct === letterOf(index) ? ' ✓' : ''}`
}
