import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  updateDoc,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from './firebase'
import { TRAIL_STAGES_COLLECTION, trailStageDocId } from './trailStageFirestore'
import {
  TRAIL_STAGE_QUESTIONS_COLLECTION,
  trailStageQuestionDocId,
} from './trailStageQuestionFirestore'
import type { ContentEtapa, StructurePhase } from './trailEditor'
import type { PhaseBlueprint, Trail } from '../types/trail'
import type { TrailStageType } from '../types/trailStage'

export const TRAILS_COLLECTION = 'trails'

function toIntLoose(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v) && Number.isInteger(v)) {
    return v
  }
  if (typeof v === 'string') {
    const n = Number.parseInt(v.trim(), 10)
    if (Number.isFinite(n) && Number.isInteger(n)) return n
  }
  return null
}

function parseStageTypeLoose(v: unknown): TrailStageType | null {
  return v === 'ai' || v === 'fixed' || v === 'exercise' ? v : null
}

function parsePhaseBlueprintLoose(raw: unknown): PhaseBlueprint | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const title = typeof o.title === 'string' ? o.title : ''
  const stage_type = parseStageTypeLoose(o.stage_type)
  if (!stage_type) return null
  const promptRaw = o.prompt
  const prompt =
    promptRaw === null || promptRaw === undefined
      ? null
      : typeof promptRaw === 'string'
        ? promptRaw
        : null
  return { title, stage_type, prompt }
}

export function snapshotToTrail(
  d: DocumentSnapshot | QueryDocumentSnapshot,
): Trail {
  const data = d.data()
  const defaultSteps = 8

  if (!data) {
    return {
      id: d.id,
      institution_id: '',
      name: '',
      description: '',
      subject: '',
      default_total_steps_per_stage: defaultSteps,
      active: false,
      created_at: null,
      updated_at: null,
    }
  }

  const rawSteps = toIntLoose(data.default_total_steps_per_stage)
  const steps = rawSteps === null ? defaultSteps : rawSteps

  let phase_blueprint: PhaseBlueprint[] | null = null
  const bpRaw = data.phase_blueprint
  if (Array.isArray(bpRaw)) {
    const parsed = bpRaw
      .map(parsePhaseBlueprintLoose)
      .filter((x): x is PhaseBlueprint => x !== null)
    if (parsed.length > 0) phase_blueprint = parsed
  }

  return {
    id: d.id,
    institution_id: typeof data.institution_id === 'string' ? data.institution_id : '',
    name: typeof data.name === 'string' ? data.name : '',
    description: typeof data.description === 'string' ? data.description : '',
    subject: typeof data.subject === 'string' ? data.subject : '',
    default_total_steps_per_stage: steps,
    active: typeof data.active === 'boolean' ? data.active : false,
    created_at: data.created_at ?? null,
    updated_at: data.updated_at ?? null,
    phase_blueprint,
  }
}

export function formatTrailTs(value: Trail['created_at']): string {
  if (!value || typeof value.toDate !== 'function') return '—'
  try {
    return value.toDate().toLocaleString('pt-BR')
  } catch {
    return '—'
  }
}

// ---------------------------------------------------------------------------
// Wrappers de escrita usados pelos componentes visuais. A lógica foi extraída
// de TrailForm sem nenhuma alteração de comportamento: mesmas coleções,
// mesmos campos, mesmas transações e mesmos payloads.
// ---------------------------------------------------------------------------

export type TrailUpdateData = {
  name: string
  description: string
  subject: string
  default_total_steps_per_stage: number
  active: boolean
}

export async function updateTrail(
  docId: string,
  data: TrailUpdateData,
): Promise<void> {
  if (!db) return
  await updateDoc(doc(db, TRAILS_COLLECTION, docId), {
    name: data.name,
    description: data.description,
    subject: data.subject,
    default_total_steps_per_stage: data.default_total_steps_per_stage,
    active: data.active,
    updated_at: serverTimestamp(),
  })
}

export type TrailStructureSaveData = {
  /** Trilha já criada nesta sessão (re-salvar) ou null para criar com ID novo. */
  targetTrailId: string | null
  institution_id: string
  name: string
  description: string
  subject: string
  default_total_steps_per_stage: number
  active: boolean
  structurePhases: StructurePhase[]
}

/**
 * Cria/atualiza a trilha e seus trail_stages em uma única transação.
 * IDs sequenciais: t1, t2, t3... com contador em counters/trails { next }.
 * Devolve o id persistido, ou null se o Firebase não estiver inicializado.
 */
export async function saveTrailWithStructure(
  data: TrailStructureSaveData,
): Promise<string | null> {
  if (!db) return null
  const dbOk = db
  const {
    targetTrailId,
    institution_id,
    name,
    description,
    subject,
    default_total_steps_per_stage: stepsToSave,
    active,
    structurePhases,
  } = data

  return runTransaction(dbOk, async (tx) => {
    let trailId = targetTrailId
    let shouldIncrementCounter = false
    let counterNext: number | null = null

    if (!trailId) {
      // IDs sequenciais: t1, t2, t3...
      // Usa transação com contador em counters/trails { next: number }.
      const counterRef = doc(dbOk, 'counters', 'trails')
      const counterSnap = await tx.get(counterRef)
      const counterData = counterSnap.exists() ? counterSnap.data() : {}
      const rawNext = (counterData as { next?: unknown }).next
      const next =
        typeof rawNext === 'number' && Number.isFinite(rawNext) && rawNext >= 1
          ? Math.floor(rawNext)
          : 1
      counterNext = next

      trailId = `t${next}`
      const trailRefCheck = doc(collection(dbOk, TRAILS_COLLECTION), trailId)
      const existing = await tx.get(trailRefCheck)
      if (existing.exists()) {
        throw new Error(
          `Conflito ao gerar id sequencial (${trailId}). Verifique counters/trails.next.`,
        )
      }
      shouldIncrementCounter = true
    }

    const trailRef = doc(collection(dbOk, TRAILS_COLLECTION), trailId)
    const previousTrailSnap = await tx.get(trailRef)
    if (targetTrailId && !previousTrailSnap.exists()) {
      throw new Error(
        'A trilha não existe mais ou foi excluída. Recarregue e crie novamente.',
      )
    }
    const previousData = previousTrailSnap.exists()
      ? (previousTrailSnap.data() as { default_total_steps_per_stage?: unknown })
      : {}
    const previousStepsRaw = previousData.default_total_steps_per_stage
    const previousSteps =
      typeof previousStepsRaw === 'number' &&
      Number.isFinite(previousStepsRaw) &&
      previousStepsRaw >= 0
        ? Math.floor(previousStepsRaw)
        : 0

    const stageSnapshots = new Map<
      number,
      ReturnType<(typeof previousTrailSnap)['data']> | null
    >()
    for (let i = 0; i < structurePhases.length; i++) {
      const stageNumber = i + 1
      const stageRef = doc(
        dbOk,
        TRAIL_STAGES_COLLECTION,
        trailStageDocId(trailId, stageNumber),
      )
      const stageSnap = await tx.get(stageRef)
      stageSnapshots.set(stageNumber, stageSnap.exists() ? stageSnap.data() : null)
    }

    const trailPayload = {
      institution_id,
      name,
      description,
      subject,
      default_total_steps_per_stage: stepsToSave,
      active,
      phase_blueprint: structurePhases.map((p) => ({
        title: p.title.trim(),
        stage_type: p.stage_type,
        prompt: p.stage_type === 'ai' ? p.prompt.trim() : null,
      })),
      updated_at: serverTimestamp(),
    }
    if (previousTrailSnap.exists()) {
      tx.update(trailRef, trailPayload)
    } else {
      tx.set(trailRef, {
        ...trailPayload,
        created_at: serverTimestamp(),
      })
    }

    for (let i = 0; i < structurePhases.length; i++) {
      const phase = structurePhases[i]
      const stageNumber = i + 1
      const stageRef = doc(
        dbOk,
        TRAIL_STAGES_COLLECTION,
        trailStageDocId(trailId, stageNumber),
      )
      const stageData = stageSnapshots.get(stageNumber) ?? null
      tx.set(
        stageRef,
        {
          trail_id: trailId,
          stage_number: stageNumber,
          title: phase.title.trim(),
          stage_type: phase.stage_type,
          prompt: phase.stage_type === 'ai' ? phase.prompt.trim() : null,
          is_released: stageData?.is_released ?? false,
          active: stageData?.active ?? true,
          created_at: stageData?.created_at ?? serverTimestamp(),
          updated_at: serverTimestamp(),
        },
        { merge: true },
      )
    }

    for (
      let stageNumber = stepsToSave + 1;
      stageNumber <= previousSteps;
      stageNumber++
    ) {
      const stageRef = doc(
        dbOk,
        TRAIL_STAGES_COLLECTION,
        trailStageDocId(trailId, stageNumber),
      )
      tx.delete(stageRef)
    }

    if (shouldIncrementCounter) {
      const counterRef = doc(dbOk, 'counters', 'trails')
      tx.set(counterRef, { next: (counterNext ?? 1) + 1 }, { merge: true })
    }

    return trailId
  })
}

/**
 * Grava os conteúdos (trail_stage_questions) do fluxo de criação da trilha,
 * uma questão por etapa, em transação única.
 */
export async function saveTrailContentDraft(
  trailId: string,
  contentEtapas: ContentEtapa[],
): Promise<void> {
  if (!db) return
  const dbOk = db

  await runTransaction(dbOk, async (tx) => {
    contentEtapas.forEach((etapa, etapaIdx) => {
      const question = etapa.questions[0]
      if (!question) return
      const questionNumber = etapaIdx + 1
      question.phases.forEach((phase, phaseIdx) => {
        const stageNumber = phaseIdx + 1
        const ref = doc(
          dbOk,
          TRAIL_STAGE_QUESTIONS_COLLECTION,
          trailStageQuestionDocId(trailId, stageNumber, questionNumber),
        )

        const etapaLabel = etapa.name.trim() || `Etapa ${etapaIdx + 1}`
        const questionLabel = question.title.trim() || `Questão ${questionNumber}`

        const contentValue =
          phase.phaseType === 'ai'
            ? phase.fixedText.trim()
            : phase.phaseType === 'fixed'
              ? phase.fixedText.trim()
              : phase.fixedText

        tx.set(ref, {
          trail_id: trailId,
          stage_number: stageNumber,
          question_number: questionNumber,
          title: `${etapaLabel} — ${questionLabel}`,
          content: contentValue,
          correct_option:
            phase.phaseType === 'exercise'
              ? phase.correctOption.trim() || null
              : null,
          options: null,
          explanation: null,
          annulled: false,
          annulled_at: null,
          annulled_reason: null,
          is_released: etapa.released,
          active: true,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        })
      })
    })
  })
}

