import type { GeneratedTrail } from './types.js'
import { normalizeCorrectOption } from './validate.js'

/** Formas usadas pelo editor admin (trailEditor / trailFirestore). */

export type MappedStructurePhase = {
  id: string
  title: string
  stage_type: 'ai' | 'fixed' | 'exercise'
  prompt: string
}

export type MappedContentPhase = {
  phaseId: string
  phaseTitle: string
  phaseType: 'ai' | 'fixed' | 'exercise'
  aiPrompt: string
  fixedText: string
  correctOption: string
  exerciseQuestions: string[]
}

export type MappedContentQuestion = {
  id: string
  title: string
  phases: MappedContentPhase[]
}

export type MappedContentEtapa = {
  id: string
  name: string
  released: boolean
  questions: MappedContentQuestion[]
}

export type MappedTrailDraft = {
  name: string
  description: string
  subject: string
  default_total_steps_per_stage: number
  active: boolean
  structurePhases: MappedStructurePhase[]
  contentEtapas: MappedContentEtapa[]
}

function id(prefix: string, n: number): string {
  return `${prefix}-${n}`
}

/**
 * Converte o JSON da IA no formato do wizard admin
 * (StructurePhase + ContentEtapa), pronto para saveTrailWithStructure /
 * saveTrailContentDraft.
 *
 * Cada conteúdo de cada etapa vira uma ContentEtapa (1 questão),
 * alinhado ao save atual que grava questions[0] por etapa.
 */
export function mapGeneratedTrailToDraft(
  trail: GeneratedTrail,
): MappedTrailDraft {
  const sortedPhases = [...trail.phases].sort((a, b) => a.position - b.position)

  const structurePhases: MappedStructurePhase[] = sortedPhases.map((p) => ({
    id: id('p', p.position),
    title: p.name.trim(),
    stage_type: p.type,
    prompt: p.type === 'ai' ? (p.globalAiCommand ?? '').trim() : '',
  }))

  const contentEtapas: MappedContentEtapa[] = []
  let etapaOrdinal = 0

  trail.stages.forEach((stage) => {
    const contents =
      Array.isArray(stage.contents) && stage.contents.length > 0
        ? stage.contents
        : []
    contents.forEach((content, ci) => {
      etapaOrdinal += 1
      const byPos = new Map(
        (content.blocks ?? []).map((b) => [b.phasePosition, b]),
      )
      const phases: MappedContentPhase[] = structurePhases.map((sp, idx) => {
        const pos = idx + 1
        const block = byPos.get(pos)
        const text = (block?.content ?? '').trim()
        const correct =
          sp.stage_type === 'exercise'
            ? normalizeCorrectOption(block?.correctOption) ?? ''
            : ''
        return {
          phaseId: sp.id,
          phaseTitle: sp.title,
          phaseType: sp.stage_type,
          aiPrompt: sp.stage_type === 'ai' ? sp.prompt : '',
          fixedText: text,
          correctOption: correct,
          exerciseQuestions: [],
        }
      })

      const etapaName =
        contents.length > 1
          ? `${stage.name.trim() || `Etapa ${etapaOrdinal}`} — ${content.title.trim() || `Conteúdo ${ci + 1}`}`
          : stage.name.trim() || `Etapa ${etapaOrdinal}`

      contentEtapas.push({
        id: id('et', etapaOrdinal),
        name: etapaName,
        released: etapaOrdinal === 1,
        questions: [
          {
            id: id('q', etapaOrdinal),
            title: content.title.trim() || `Questão ${etapaOrdinal}`,
            phases,
          },
        ],
      })
    })
  })

  return {
    name: trail.name.trim(),
    description: trail.objective.trim(),
    subject: (trail.subject || '').trim() || 'Geral',
    default_total_steps_per_stage: structurePhases.length,
    active: true,
    structurePhases,
    contentEtapas,
  }
}
