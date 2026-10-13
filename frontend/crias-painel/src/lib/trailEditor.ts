import type { TrailStageQuestion } from '../types/trailStageQuestion'
import type { TrailStage, TrailStageType } from '../types/trailStage'

export type StructurePhase = {
  id: string
  title: string
  stage_type: TrailStageType
  prompt: string
}

export type ContentPhase = {
  phaseId: string
  phaseTitle: string
  phaseType: TrailStageType
  aiPrompt: string
  fixedText: string
  correctOption: string
  exerciseQuestions: string[]
}

export type ContentQuestion = {
  id: string
  title: string
  phases: ContentPhase[]
}

export type ContentEtapa = {
  id: string
  name: string
  released: boolean
  questions: ContentQuestion[]
}

export type BulkTemplateRow = {
  Etapa: string
  [key: string]: string
}

export type BulkImportError = {
  rowNumber: number
  field: string
  message: string
}

export type BulkImportPreview = {
  totalRows: number
  validRows: number
  invalidRows: number
  errorsByRow: BulkImportError[]
  nextContentEtapas: ContentEtapa[]
}

export function newId(prefix: string): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function newStructurePhase(
  title: string,
  stage_type: TrailStageType,
): StructurePhase {
  return { id: newId('p'), title, stage_type, prompt: '' }
}

export function defaultStructurePhases(): StructurePhase[] {
  return [
    newStructurePhase('Introdução', 'ai'),
    newStructurePhase('Explicação', 'fixed'),
    newStructurePhase('Prática', 'exercise'),
  ]
}

export function buildQuestionFromStructure(
  title: string,
  phases: StructurePhase[],
): ContentQuestion {
  return {
    id: newId('q'),
    title,
    phases: phases.map((phase) => ({
      phaseId: phase.id,
      phaseTitle: phase.title.trim() || 'Fase',
      phaseType: phase.stage_type,
      aiPrompt: phase.stage_type === 'ai' ? phase.prompt.trim() : '',
      fixedText: '',
      correctOption: '',
      exerciseQuestions: [],
    })),
  }
}

export function defaultEtapasFromStructure(phases: StructurePhase[]): ContentEtapa[] {
  const firstQuestion = buildQuestionFromStructure('Questão 1', phases)
  return [
    {
      id: newId('et'),
      name: 'Etapa 1',
      released: true,
      questions: [firstQuestion],
    },
  ]
}

export function syncQuestionPhasesWithStructure(
  question: ContentQuestion,
  structure: StructurePhase[],
): ContentPhase[] {
  return structure.map((phaseDef, idx) => {
    const existing =
      question.phases[idx] ??
      question.phases.find((p) => p.phaseId === phaseDef.id) ??
      null

    return {
      phaseId: phaseDef.id,
      phaseTitle: phaseDef.title.trim() || `Fase ${idx + 1}`,
      phaseType: phaseDef.stage_type,
      aiPrompt:
        existing?.aiPrompt ??
        (phaseDef.stage_type === 'ai' ? phaseDef.prompt.trim() : ''),
      fixedText: existing?.fixedText ?? '',
      correctOption: existing?.correctOption ?? '',
      exerciseQuestions: existing?.exerciseQuestions ?? [],
    }
  })
}

function normalizeCell(raw: unknown): string {
  if (raw === null || raw === undefined) return ''
  if (typeof raw === 'string') return raw.trim()
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw)
  if (typeof raw === 'boolean') return raw ? 'sim' : 'nao'
  return ''
}

function parseQuestionTitle(rawTitle: string, fallbackQuestionNumber: number): string {
  const parts = rawTitle.split(' — ')
  if (parts.length >= 2) {
    const maybe = parts.slice(1).join(' — ').trim()
    if (maybe.length > 0) return maybe
  }
  return `Questão ${fallbackQuestionNumber}`
}

export function structurePhasesFromTrailData(
  phaseBlueprint: Array<{ title: string; stage_type: TrailStageType; prompt: string | null }> | null | undefined,
  stages: TrailStage[],
): StructurePhase[] {
  if (Array.isArray(phaseBlueprint) && phaseBlueprint.length > 0) {
    return phaseBlueprint.map((phase, idx) => ({
      id: `bp-${idx + 1}`,
      title: phase.title?.trim() || `Fase ${idx + 1}`,
      stage_type: phase.stage_type,
      prompt: phase.stage_type === 'ai' ? (phase.prompt ?? '') : '',
    }))
  }

  if (stages.length > 0) {
    const sorted = [...stages].sort((a, b) => a.stage_number - b.stage_number)
    return sorted.map((stage) => ({
      id: `st-${stage.stage_number}`,
      title: stage.title?.trim() || `Fase ${stage.stage_number}`,
      stage_type: stage.stage_type,
      prompt: stage.stage_type === 'ai' ? (stage.prompt ?? '') : '',
    }))
  }

  return defaultStructurePhases()
}

export function contentEtapasFromTrailStageQuestions(
  rows: TrailStageQuestion[],
  phases: StructurePhase[],
): ContentEtapa[] {
  if (rows.length === 0) return defaultEtapasFromStructure(phases)

  const byQuestion = new Map<number, TrailStageQuestion[]>()
  for (const row of rows) {
    const questionNumber = row.question_number
    if (!byQuestion.has(questionNumber)) byQuestion.set(questionNumber, [])
    byQuestion.get(questionNumber)?.push(row)
  }

  const questionNumbers = Array.from(byQuestion.keys()).sort((a, b) => a - b)

  return questionNumbers.map((questionNumber, idx) => {
    const group = byQuestion.get(questionNumber) ?? []
    const byStage = new Map<number, TrailStageQuestion>()
    for (const row of group) byStage.set(row.stage_number, row)

    const first = group[0] ?? null
    const questionTitle = parseQuestionTitle(first?.title ?? '', questionNumber)

    const question: ContentQuestion = {
      id: `q-${questionNumber}`,
      title: questionTitle,
      phases: phases.map((phase, phaseIdx) => {
        const stageNumber = phaseIdx + 1
        const doc = byStage.get(stageNumber) ?? null
        const contentRaw = doc?.content ?? ''
        return {
          phaseId: phase.id,
          phaseTitle: phase.title.trim() || `Fase ${stageNumber}`,
          phaseType: phase.stage_type,
          aiPrompt: phase.stage_type === 'ai' ? phase.prompt.trim() : '',
          fixedText: contentRaw,
          correctOption: doc?.correct_option ?? '',
          exerciseQuestions: [],
        }
      }),
    }

    return {
      id: `et-${questionNumber}`,
      name: `Etapa ${idx + 1}`,
      released: first?.is_released ?? false,
      questions: [question],
    }
  })
}

export function bulkTemplateHeadersForStructure(phases: StructurePhase[]): string[] {
  const headers = ['Etapa']
  for (let i = 0; i < phases.length; i++) {
    const phaseNum = i + 1
    headers.push(`Fase ${phaseNum}`)
  }
  return headers
}

export function buildBulkTemplateRows(
  phases: StructurePhase[],
  rowCount = 5,
): BulkTemplateRow[] {
  return Array.from({ length: rowCount }, (_, idx) => {
    const etapaNumber = idx + 1
    const row: BulkTemplateRow = {
      Etapa: String(etapaNumber),
    }

    for (let i = 0; i < phases.length; i++) {
      const phaseNum = i + 1
      const phase = phases[i]
      row[`Fase ${phaseNum}`] =
        phase.stage_type === 'exercise'
          ? '1. Escreva uma pergunta de exercicio aqui'
          : phase.stage_type === 'ai'
            ? 'Texto base para a fase com IA'
            : 'Texto fixo da fase'
    }
    return row
  })
}

export function buildBulkInstructionsRows(phases: StructurePhase[]): string[][] {
  const stageDetails = phases.map((phase, idx) => {
    const label = phase.title.trim() || `Fase ${idx + 1}`
    return `${idx + 1}: ${label} (${phase.stage_type})`
  })
  return [
    ['Campo', 'Como preencher'],
    ['Etapa', 'Inteiro >= 1, sem duplicidade (ex.: 1, 2, 3...).'],
    [
      'Fase X',
      'Para ai/fixed: texto obrigatorio. Para exercise: pelo menos 1 item (pode usar varias linhas).',
    ],
    ['Quantidade de fases', String(phases.length)],
    ['Estrutura atual (referencia)', stageDetails.join(' | ')],
  ]
}

export function parseBulkTemplateRows(
  rawRows: Array<Record<string, unknown>>,
  phases: StructurePhase[],
): BulkImportPreview {
  const errors: BulkImportError[] = []
  const byEtapaNumber = new Map<number, ContentEtapa>()
  const expectedPhaseCount = phases.length

  for (let idx = 0; idx < rawRows.length; idx++) {
    const row = rawRows[idx] ?? {}
    const rowNumber = idx + 2
    const etapaNumberRaw = normalizeCell(row.Etapa ?? row.etapa_numero)
    const etapaNumber = Number.parseInt(etapaNumberRaw, 10)

    if (!etapaNumberRaw) continue

    if (!Number.isFinite(etapaNumber) || etapaNumber < 1) {
      errors.push({
        rowNumber,
        field: 'Etapa',
        message: 'Etapa deve ser um inteiro maior ou igual a 1.',
      })
      continue
    }
    if (byEtapaNumber.has(etapaNumber)) {
      errors.push({
        rowNumber,
        field: 'Etapa',
        message: `Etapa ${etapaNumber} duplicada na planilha.`,
      })
      continue
    }

    const etapaName = `Etapa ${etapaNumber}`
    const question: ContentQuestion = {
      id: newId('q'),
      title: parseQuestionTitle('', etapaNumber),
      phases: [],
    }

    let phaseError = false
    for (let phaseIdx = 0; phaseIdx < expectedPhaseCount; phaseIdx++) {
      const phaseNumber = phaseIdx + 1
      const phase = phases[phaseIdx]
      const contentField = `Fase ${phaseNumber}`
      const legacyField = `fase_${phaseNumber}_conteudo`
      const contentRaw = normalizeCell(row[contentField])
      const legacyRaw = normalizeCell(row[legacyField])
      const contentValue = contentRaw || legacyRaw
      if (phase.stage_type === 'exercise') {
        if (!contentValue.trim()) {
          errors.push({
            rowNumber,
            field: contentField,
            message: `fase ${phaseNumber} (exercise) exige conteudo.`,
          })
          phaseError = true
        }
        question.phases.push({
          phaseId: phase.id,
          phaseTitle: phase.title.trim() || `Fase ${phaseNumber}`,
          phaseType: phase.stage_type,
          aiPrompt: '',
          fixedText: contentValue,
          correctOption: '',
          exerciseQuestions: [],
        })
      } else {
        if (!contentValue) {
          errors.push({
            rowNumber,
            field: contentField,
            message: `fase ${phaseNumber} (${phase.stage_type}) exige conteudo.`,
          })
          phaseError = true
        }
        question.phases.push({
          phaseId: phase.id,
          phaseTitle: phase.title.trim() || `Fase ${phaseNumber}`,
          phaseType: phase.stage_type,
          aiPrompt: phase.stage_type === 'ai' ? phase.prompt.trim() : '',
          fixedText: contentValue,
          correctOption: '',
          exerciseQuestions: [],
        })
      }
    }

    if (phaseError) continue

    byEtapaNumber.set(etapaNumber, {
      id: newId('et'),
      name: etapaName,
      released: etapaNumber === 1,
      questions: [question],
    })
  }

  const ordered = Array.from(byEtapaNumber.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, etapa]) => etapa)

  const invalidRows = Array.from(new Set(errors.map((error) => error.rowNumber))).length
  return {
    totalRows: rawRows.length,
    validRows: ordered.length,
    invalidRows,
    errorsByRow: errors,
    nextContentEtapas: ordered,
  }
}
