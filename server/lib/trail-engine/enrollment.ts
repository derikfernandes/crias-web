import type { DocumentSnapshot, Firestore } from 'firebase-admin/firestore'
import { FieldValue } from 'firebase-admin/firestore'

import { TrailEngineError } from './errors'
import type {
  CollectionNames,
  LastDelivered,
  StudentTrailProgress,
  StudentTrailStatus,
  TrailChannel,
} from './types'
import { defaultCollectionNames } from './types'

export function studentTrailDocId(studentId: string, trailId: string): string {
  return `${studentId}_trail_${trailId}`
}

export function stageDocId(trailId: string, stageNumber: number): string {
  return `${trailId}_stage_${stageNumber}`
}

export function questionDocId(
  trailId: string,
  stageNumber: number,
  questionNumber: number,
): string {
  return `${trailId}_stage_${stageNumber}_q_${questionNumber}`
}

export function parseStatus(raw: unknown): StudentTrailStatus {
  if (
    raw === 'in_progress' ||
    raw === 'completed' ||
    raw === 'blocked' ||
    raw === 'not_started'
  ) {
    return raw
  }
  return 'not_started'
}

export function parseProgressVersion(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) {
    return Math.floor(raw)
  }
  return 0
}

export function parsePositiveInt(raw: unknown, fallback: number): number {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 1) {
    return Math.floor(raw)
  }
  return fallback
}

function parseLastDelivered(raw: unknown): LastDelivered | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const stage_number = parsePositiveInt(o.stage_number, 0)
  const question_number = parsePositiveInt(o.question_number, 0)
  const content_fingerprint =
    typeof o.content_fingerprint === 'string' ? o.content_fingerprint : ''
  if (stage_number < 1 || question_number < 1 || !content_fingerprint) {
    return null
  }
  return { stage_number, question_number, content_fingerprint }
}

function parseChannel(raw: unknown): TrailChannel | null {
  if (raw === 'whatsapp' || raw === 'app' || raw === 'admin') return raw
  return null
}

export function snapshotToProgress(
  snap: DocumentSnapshot,
): StudentTrailProgress | null {
  if (!snap.exists) return null
  const data = (snap.data() ?? {}) as Record<string, unknown>
  const id = snap.id
  const parts = id.split('_trail_')
  const fallbackStudent = parts[0] ?? ''
  const fallbackTrail = parts.length > 1 ? parts.slice(1).join('_trail_') : ''

  return {
    id,
    student_id:
      typeof data.student_id === 'string' ? data.student_id : fallbackStudent,
    institution_id:
      typeof data.institution_id === 'string' ? data.institution_id : '',
    trail_id: typeof data.trail_id === 'string' ? data.trail_id : fallbackTrail,
    current_stage_number: parsePositiveInt(data.current_stage_number, 1),
    current_question_number: parsePositiveInt(data.current_question_number, 1),
    status: parseStatus(data.status),
    progress_version: parseProgressVersion(data.progress_version),
    last_idempotency_key:
      typeof data.last_idempotency_key === 'string'
        ? data.last_idempotency_key
        : null,
    last_channel: parseChannel(data.last_channel),
    last_delivered: parseLastDelivered(data.last_delivered),
    last_advance_at: data.last_advance_at ?? null,
    started_at: data.started_at ?? null,
    completed_at: data.completed_at ?? null,
    last_interaction_at: data.last_interaction_at ?? null,
    created_at: data.created_at ?? null,
    updated_at: data.updated_at ?? null,
  }
}

/** Campos additive com defaults seguros (I3). */
export function additiveProgressDefaults(): Record<string, unknown> {
  return {
    progress_version: 0,
    last_idempotency_key: null,
    last_idempotency_effect: null,
    last_idempotency_request: null,
    last_channel: null,
    last_delivered: null,
    last_advance_at: null,
  }
}

export type EnsureEnrollmentInput = {
  student_id: string
  trail_id: string
  institution_id?: string
  current_stage_number?: number
  current_question_number?: number
  status?: StudentTrailStatus
}

/**
 * Create idempotente de student_trails. Se já existe, devolve o doc atual.
 * Conflito real (existe com outro par) não ocorre — doc id é composto.
 */
export async function ensureEnrollment(
  db: Firestore,
  input: EnsureEnrollmentInput,
  collections: CollectionNames = defaultCollectionNames(),
): Promise<{ progress: StudentTrailProgress; created: boolean }> {
  const studentId = input.student_id.trim()
  const trailId = input.trail_id.trim()
  if (!studentId || !trailId) {
    throw new TrailEngineError(
      'invalid_payload',
      'student_id e trail_id são obrigatórios.',
    )
  }

  const [studentSnap, trailSnap] = await Promise.all([
    db.collection(collections.students).doc(studentId).get(),
    db.collection(collections.trails).doc(trailId).get(),
  ])

  if (!studentSnap.exists) {
    throw new TrailEngineError('not_found', `Aluno "${studentId}" não encontrado.`)
  }
  if (!trailSnap.exists) {
    throw new TrailEngineError('not_found', `Trilha "${trailId}" não encontrada.`)
  }

  const studentData = (studentSnap.data() ?? {}) as Record<string, unknown>
  const trailData = (trailSnap.data() ?? {}) as Record<string, unknown>
  const studentInst =
    typeof studentData.institution_id === 'string'
      ? studentData.institution_id.trim()
      : ''
  const trailInst =
    typeof trailData.institution_id === 'string'
      ? trailData.institution_id.trim()
      : ''

  if (!studentInst || !trailInst || studentInst !== trailInst) {
    throw new TrailEngineError(
      'conflict',
      'Inconsistência de instituição: aluno e trilha pertencem a instituições diferentes.',
    )
  }

  if (input.institution_id && input.institution_id.trim() !== trailInst) {
    throw new TrailEngineError(
      'conflict',
      'institution_id enviado não corresponde ao da trilha.',
    )
  }

  const docId = studentTrailDocId(studentId, trailId)
  const ref = db.collection(collections.studentTrails).doc(docId)
  const now = FieldValue.serverTimestamp()
  const status = input.status ?? 'not_started'
  const stage = input.current_stage_number ?? 1
  const question = input.current_question_number ?? 1

  const created = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (snap.exists) return false

    const base: Record<string, unknown> = {
      student_id: studentId,
      institution_id: trailInst,
      trail_id: trailId,
      current_stage_number: stage,
      current_question_number: question,
      status,
      completed_at: null,
      last_interaction_at: null,
      created_at: now,
      updated_at: now,
      ...additiveProgressDefaults(),
    }
    if (status === 'in_progress') {
      base.started_at = now
    } else {
      base.started_at = null
    }
    tx.set(ref, base)
    return true
  })

  const snap = await ref.get()
  const progress = snapshotToProgress(snap)
  if (!progress) {
    throw new TrailEngineError(
      'internal_error',
      'Falha ao ler progresso após ensureEnrollment.',
    )
  }
  return { progress, created }
}

export async function getEnrollment(
  db: Firestore,
  studentId: string,
  trailId: string,
  collections: CollectionNames = defaultCollectionNames(),
): Promise<StudentTrailProgress | null> {
  const snap = await db
    .collection(collections.studentTrails)
    .doc(studentTrailDocId(studentId, trailId))
    .get()
  return snapshotToProgress(snap)
}

export async function requireEnrollment(
  db: Firestore,
  studentId: string,
  trailId: string,
  collections: CollectionNames = defaultCollectionNames(),
): Promise<StudentTrailProgress> {
  const progress = await getEnrollment(db, studentId, trailId, collections)
  if (!progress) {
    throw new TrailEngineError(
      'not_found',
      'Progresso da trilha não encontrado para este aluno.',
    )
  }
  return progress
}

/**
 * Lista matrículas do aluno. U3 Wave B: trilha ativa = primeira (ordem de doc id).
 * Exclui namespaces tutor (`Tutor -` / `Trilha -`) se aparecerem como trail_id.
 */
export async function listEnrollmentsForStudent(
  db: Firestore,
  studentId: string,
  collections: CollectionNames = defaultCollectionNames(),
): Promise<StudentTrailProgress[]> {
  const id = studentId.trim()
  if (!id) return []

  const snap = await db
    .collection(collections.studentTrails)
    .where('student_id', '==', id)
    .limit(50)
    .get()

  const rows: StudentTrailProgress[] = []
  for (const doc of snap.docs) {
    const progress = snapshotToProgress(doc)
    if (!progress) continue
    const tid = progress.trail_id
    if (tid.startsWith('Tutor -') || tid.startsWith('Trilha -')) continue
    rows.push(progress)
  }

  rows.sort((a, b) => a.id.localeCompare(b.id))
  return rows
}

/** Trilha ativa v1 = primeiro enrollment curricular (U3). */
export async function getActiveEnrollment(
  db: Firestore,
  studentId: string,
  collections: CollectionNames = defaultCollectionNames(),
): Promise<StudentTrailProgress | null> {
  const list = await listEnrollmentsForStudent(db, studentId, collections)
  return list[0] ?? null
}
