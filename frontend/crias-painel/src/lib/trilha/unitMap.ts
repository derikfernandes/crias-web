/**
 * Unit map (Ciclo 2) — view-model derivado do cursor + histórico (sem SoT paralelo).
 */

import type { TrailPathNodeState } from './trailPath'

export type UnitStepType = 'fixed' | 'exercise' | 'ai' | null

export type UnitStepNode = {
  stageNumber: number
  questionNumber: number
  state: TrailPathNodeState
  stepType: UnitStepType
  /** Título só para passos done (histórico) — sem spoiler de futuros. */
  title: string | null
}

export type UnitSection = {
  stageNumber: number
  status: 'done' | 'current' | 'ahead'
  collapsed: boolean
  steps: UnitStepNode[]
  /** Resumo curto para etapas colapsadas. */
  summary: string
}

export type HistoryStepHint = {
  stageNumber: number
  questionNumber: number
  stageType: UnitStepType
  title: string | null
  attemptedAt?: string | null
}

const TYPE_LABEL: Record<'fixed' | 'exercise' | 'ai', string> = {
  fixed: 'leitura',
  exercise: 'exercício',
  ai: 'IA',
}

export function stepTypeLabel(t: UnitStepType): string | null {
  if (t === 'fixed' || t === 'exercise' || t === 'ai') return TYPE_LABEL[t]
  return null
}

/** Secções = fases (`stage_number`); paginação mockup v2 — ver `trilha-data-model-student-view.md` §8. */
export const UNIT_MAP_STAGE_PAGE_SIZE = 3

/** Passos = aulas (`question_number`) dentro da etapa corrente. */
export const UNIT_MAP_QUESTION_PAGE_SIZE = 5

/**
 * Constrói secções por etapa.
 * - Etapas &lt; current: done, colapsadas, passos do histórico
 * - Etapa current: expandida; questões 1..totalQuestions (ou janela)
 * - Etapas &gt; current: ahead, colapsadas, sem passos (sem spoiler)
 */
export function buildUnitSections(input: {
  currentStage: number
  currentQuestion: number
  totalStages: number | null
  totalQuestions: number | null
  currentStageType: UnitStepType
  paused?: boolean
  completed?: boolean
  history: HistoryStepHint[]
}): UnitSection[] {
  const stage = Math.max(1, Math.floor(input.currentStage) || 1)
  const question = Math.max(1, Math.floor(input.currentQuestion) || 1)
  const totalStages =
    typeof input.totalStages === 'number' && input.totalStages >= 1
      ? Math.floor(input.totalStages)
      : Math.max(stage + 1, stage)
  const totalQ =
    typeof input.totalQuestions === 'number' && input.totalQuestions >= 1
      ? Math.floor(input.totalQuestions)
      : Math.max(question + 1, question)

  const histByKey = new Map<string, HistoryStepHint>()
  for (const h of input.history) {
    histByKey.set(`${h.stageNumber}:${h.questionNumber}`, h)
  }

  const sections: UnitSection[] = []

  for (let s = 1; s <= totalStages; s += 1) {
    if (input.completed || s < stage) {
      const steps: UnitStepNode[] = input.history
        .filter((h) => h.stageNumber === s)
        .sort((a, b) => a.questionNumber - b.questionNumber)
        .map((h) => ({
          stageNumber: s,
          questionNumber: h.questionNumber,
          state: 'done' as const,
          stepType: h.stageType,
          title: h.title,
        }))

      if (!input.completed && s < stage) {
        const hasCell = steps.some((st) => st.questionNumber === question)
        if (!hasCell) {
          const hint = histByKey.get(`${s}:${question}`)
          steps.push({
            stageNumber: s,
            questionNumber: question,
            state: 'done',
            stepType: hint?.stageType ?? null,
            title: hint?.title ?? null,
          })
          steps.sort((a, b) => a.questionNumber - b.questionNumber)
        }
      }
      sections.push({
        stageNumber: s,
        status: 'done',
        collapsed: true,
        steps,
        summary:
          steps.length > 0
            ? `Etapa ${s} · Concluída · ${steps.length} passo${steps.length === 1 ? '' : 's'}`
            : `Etapa ${s} · Concluída`,
      })
      continue
    }

    if (s === stage) {
      const steps: UnitStepNode[] = []
      for (let q = 1; q <= totalQ; q += 1) {
        const hint = histByKey.get(`${s}:${q}`)
        let state: TrailPathNodeState
        if (input.completed || q < question) state = 'done'
        else if (q === question) state = input.paused ? 'paused' : 'current'
        else state = 'upcoming'

        steps.push({
          stageNumber: s,
          questionNumber: q,
          state,
          stepType:
            state === 'current' || state === 'paused'
              ? input.currentStageType
              : state === 'done'
                ? (hint?.stageType ?? null)
                : null,
          title: state === 'done' ? (hint?.title ?? null) : null,
        })
      }
      sections.push({
        stageNumber: s,
        status: 'current',
        collapsed: false,
        steps,
        summary: input.paused
          ? `Etapa ${s} · Pausada`
          : `Etapa ${s} · Em andamento`,
      })
      continue
    }

    // ahead
    sections.push({
      stageNumber: s,
      status: 'ahead',
      collapsed: true,
      steps: [],
      summary: `Etapa ${s} · Em breve`,
    })
  }

  return sections
}
