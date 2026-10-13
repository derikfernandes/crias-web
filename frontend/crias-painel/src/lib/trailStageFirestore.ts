import {
  deleteDoc,
  doc,
  runTransaction,
  serverTimestamp,
  updateDoc,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from './firebase'
import type { TrailStage, TrailStageType } from '../types/trailStage'

export const TRAIL_STAGES_COLLECTION = 'trail_stages'

export function trailStageDocId(trailId: string, stageNumber: number): string {
  return `${trailId}_stage_${stageNumber}`
}

function parseStageTypeFromDoc(v: unknown): TrailStageType {
  if (v === 'ai' || v === 'fixed' || v === 'exercise') return v
  return 'fixed'
}

function parsePromptFromDoc(
  stageType: TrailStageType,
  v: unknown,
): string | null {
  if (v === null || v === undefined) return null
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (!s.length) return null
  return stageType === 'ai' ? s : null
}

export function snapshotToTrailStage(
  d: DocumentSnapshot | QueryDocumentSnapshot,
): TrailStage {
  const data = d.data()
  if (!data) {
    return {
      id: d.id,
      trail_id: '',
      stage_number: 1,
      title: '',
      stage_type: 'fixed',
      prompt: null,
      is_released: false,
      active: false,
      created_at: null,
      updated_at: null,
    }
  }

  const stage_type = parseStageTypeFromDoc(data.stage_type)

  return {
    id: d.id,
    trail_id: typeof data.trail_id === 'string' ? data.trail_id : '',
    stage_number:
      typeof data.stage_number === 'number' && Number.isFinite(data.stage_number)
        ? data.stage_number
        : 1,
    title: typeof data.title === 'string' ? data.title : '',
    stage_type,
    prompt: parsePromptFromDoc(stage_type, data.prompt),
    is_released: typeof data.is_released === 'boolean' ? data.is_released : false,
    active: typeof data.active === 'boolean' ? data.active : false,
    created_at: data.created_at ?? null,
    updated_at: data.updated_at ?? null,
  }
}

export function formatTrailStageTs(value: TrailStage['created_at']): string {
  if (!value || typeof value.toDate !== 'function') return '—'
  try {
    return value.toDate().toLocaleString('pt-BR')
  } catch {
    return '—'
  }
}

// ---------------------------------------------------------------------------
// Wrappers de escrita usados pelos componentes visuais. A lógica foi extraída
// de TrailStageForm sem nenhuma alteração de comportamento: mesma coleção,
// mesmos campos e mesmos payloads.
// ---------------------------------------------------------------------------

export type TrailStageUpdateData = {
  title: string
  stage_type: TrailStageType
  prompt: string | null
  is_released: boolean
  active: boolean
}

export async function updateTrailStage(
  docId: string,
  data: TrailStageUpdateData,
): Promise<void> {
  if (!db) throw new Error('Firebase não inicializado.')
  await updateDoc(doc(db, TRAIL_STAGES_COLLECTION, docId), {
    title: data.title,
    stage_type: data.stage_type,
    prompt: data.prompt,
    is_released: data.is_released,
    active: data.active,
    updated_at: serverTimestamp(),
  })
}

export type TrailStageCreateData = {
  trail_id: string
  stage_number: number
  title: string
  stage_type: TrailStageType
  prompt: string | null
}

/**
 * Cria o stage em transação, falhando se já existir um stage_number igual
 * para a mesma trilha (mesmo doc id determinístico usado pelo formulário).
 */
export async function createTrailStage(data: TrailStageCreateData): Promise<void> {
  if (!db) throw new Error('Firebase não inicializado.')
  const dbOk = db
  const newDocId = trailStageDocId(data.trail_id, data.stage_number)
  const now = serverTimestamp()

  await runTransaction(dbOk, async (tx) => {
    const ref = doc(dbOk, TRAIL_STAGES_COLLECTION, newDocId)
    const existing = await tx.get(ref)
    if (existing.exists()) {
      throw new Error(
        `Já existe um stage_number ${data.stage_number} para trail_id "${data.trail_id}".`,
      )
    }

    tx.set(ref, {
      trail_id: data.trail_id,
      stage_number: data.stage_number,
      title: data.title,
      stage_type: data.stage_type,
      prompt: data.prompt,
      is_released: false,
      active: true,
      created_at: now,
      updated_at: now,
    })
  })
}

export async function deleteTrailStage(docId: string): Promise<void> {
  if (!db) return
  await deleteDoc(doc(db, TRAIL_STAGES_COLLECTION, docId))
}

