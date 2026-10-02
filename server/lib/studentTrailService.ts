import type {
  DocumentSnapshot,
  Firestore,
} from 'firebase-admin/firestore'
import { FieldValue } from 'firebase-admin/firestore'

import type {
  StudentTrailCreatePayload,
  StudentTrailStatus,
} from './studentTrailValidation'
import {
  additiveProgressDefaults,
  advance as engineAdvance,
  buildStableIdempotencyKey,
  markInteraction,
  setProgressStatus,
  snapshotToProgress,
  studentTrailDocId as engineDocId,
} from './trail-engine'
import type { TrailChannel } from './trail-engine'

export type StudentTrailRuntimePosition = {
  student_id: string
  institution_id: string
  trail_id: string
  current_stage_number: number
  current_question_number: number
  status: StudentTrailStatus
  progress_version?: number
}

export function studentTrailDocId(studentId: string, trailId: string): string {
  return engineDocId(studentId, trailId)
}

function resolveLegacyKey(input: {
  headerKey?: string | null
  channel: TrailChannel
  studentId: string
  trailId: string
  intent: string
  stage: number
  question: number
  progress_version: number
  extra?: string
}): string {
  const fromHeader = input.headerKey?.trim()
  if (fromHeader) return fromHeader
  return buildStableIdempotencyKey({
    channel: input.channel,
    student_id: input.studentId,
    trail_id: input.trailId,
    intent: input.intent,
    stage: input.stage,
    question: input.question,
    progress_version: input.progress_version,
    extra: input.extra,
  })
}

export async function createStudentTrail(
  db: Firestore,
  collectionName: string,
  data: StudentTrailCreatePayload,
): Promise<{ id: string }> {
  const institutionId = data.institution_id.trim()
  if (!institutionId) {
    throw new Error('Campo "institution_id" inválido para criar student_trails.')
  }
  const docId = studentTrailDocId(data.student_id, data.trail_id)
  const ref = db.collection(collectionName).doc(docId)
  const now = FieldValue.serverTimestamp()

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (snap.exists) {
      throw new Error(
        `Já existe um registro de progresso para student_id "${data.student_id}" e trail_id "${data.trail_id}".`,
      )
    }

    const base: Record<string, unknown> = {
      student_id: data.student_id,
      institution_id: institutionId,
      trail_id: data.trail_id,
      current_stage_number: data.current_stage_number,
      current_question_number: data.current_question_number,
      status: data.status,
      completed_at: null,
      last_interaction_at: null,
      created_at: now,
      updated_at: now,
      ...additiveProgressDefaults(),
    }

    if (data.status === 'in_progress') {
      base.started_at = now
    } else {
      base.started_at = null
    }

    tx.set(ref, base)
  })

  return { id: docId }
}

export async function getStudentTrailById(
  db: Firestore,
  collectionName: string,
  id: string,
): Promise<DocumentSnapshot> {
  return db.collection(collectionName).doc(id).get()
}

export async function getStudentTrailByComposite(
  db: Firestore,
  collectionName: string,
  studentId: string,
  trailId: string,
): Promise<DocumentSnapshot> {
  const id = studentTrailDocId(studentId, trailId)
  return getStudentTrailById(db, collectionName, id)
}

export async function updateStudentTrailFields(
  db: Firestore,
  collectionName: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  await db
    .collection(collectionName)
    .doc(id)
    .update({
      ...patch,
      updated_at: FieldValue.serverTimestamp(),
    })
}

export async function getStudentTrailPosition(
  db: Firestore,
  collectionName: string,
  studentId: string,
  trailId: string,
): Promise<StudentTrailRuntimePosition | null> {
  const snap = await getStudentTrailByComposite(
    db,
    collectionName,
    studentId,
    trailId,
  )
  const progress = snapshotToProgress(snap)
  if (!progress) return null

  return {
    student_id: progress.student_id,
    institution_id: progress.institution_id,
    trail_id: progress.trail_id,
    current_stage_number: progress.current_stage_number,
    current_question_number: progress.current_question_number,
    status: progress.status,
    progress_version: progress.progress_version,
  }
}

/**
 * Strangler: Chatis 2.4 `advance_question` → motor com legacy_primitive.
 * Efeito observado: question+1 (sem wrap).
 * Idempotency: header se presente; senão chave estável posição+versão (I7).
 */
export async function advanceStudentTrailQuestion(
  db: Firestore,
  _collectionName: string,
  studentId: string,
  trailId: string,
  options?: { channel?: TrailChannel; idempotency_key?: string },
): Promise<StudentTrailRuntimePosition> {
  const channel = options?.channel ?? 'whatsapp'
  const before = await getStudentTrailPosition(
    db,
    process.env.STUDENT_TRAILS_COLLECTION ?? 'student_trails',
    studentId,
    trailId,
  )
  if (!before) {
    throw new Error('Progresso da trilha não encontrado para este aluno.')
  }

  const key = resolveLegacyKey({
    headerKey: options?.idempotency_key,
    channel,
    studentId,
    trailId,
    intent: 'advance_question',
    stage: before.current_stage_number,
    question: before.current_question_number,
    progress_version: before.progress_version ?? 0,
  })

  const result = await engineAdvance(db, {
    student_id: studentId,
    trail_id: trailId,
    idempotency_key: key,
    channel,
    reason: 'legacy_primitive',
    legacy_primitive: 'advance_question',
  })

  const pos = await getStudentTrailPosition(
    db,
    process.env.STUDENT_TRAILS_COLLECTION ?? 'student_trails',
    studentId,
    trailId,
  )
  if (!pos) {
    throw new Error('Progresso da trilha não encontrado para este aluno.')
  }

  return {
    ...pos,
    current_stage_number: result.next_stage_number,
    current_question_number: result.next_question_number,
    progress_version: result.progress_version,
  }
}

/**
 * Strangler: Chatis 2.4 `advance_stage` → motor com legacy_primitive.
 * Efeito observado: stage+1 (sem wrap).
 */
export async function advanceStudentTrailStage(
  db: Firestore,
  _collectionName: string,
  studentId: string,
  trailId: string,
  options?: { channel?: TrailChannel; idempotency_key?: string },
): Promise<StudentTrailRuntimePosition> {
  const channel = options?.channel ?? 'whatsapp'
  const before = await getStudentTrailPosition(
    db,
    process.env.STUDENT_TRAILS_COLLECTION ?? 'student_trails',
    studentId,
    trailId,
  )
  if (!before) {
    throw new Error('Progresso da trilha não encontrado para este aluno.')
  }

  const key = resolveLegacyKey({
    headerKey: options?.idempotency_key,
    channel,
    studentId,
    trailId,
    intent: 'advance_stage',
    stage: before.current_stage_number,
    question: before.current_question_number,
    progress_version: before.progress_version ?? 0,
  })

  const result = await engineAdvance(db, {
    student_id: studentId,
    trail_id: trailId,
    idempotency_key: key,
    channel,
    reason: 'legacy_primitive',
    legacy_primitive: 'advance_stage',
  })

  const pos = await getStudentTrailPosition(
    db,
    process.env.STUDENT_TRAILS_COLLECTION ?? 'student_trails',
    studentId,
    trailId,
  )
  if (!pos) {
    throw new Error('Progresso da trilha não encontrado para este aluno.')
  }

  return {
    ...pos,
    current_stage_number: result.next_stage_number,
    current_question_number: result.next_question_number,
    progress_version: result.progress_version,
  }
}

export async function markStudentTrailLastInteraction(
  db: Firestore,
  _collectionName: string,
  studentId: string,
  trailId: string,
  channel?: TrailChannel,
): Promise<void> {
  await markInteraction(db, {
    student_id: studentId,
    trail_id: trailId,
    channel,
  })
}

export async function updateStudentTrailStatus(
  db: Firestore,
  _collectionName: string,
  studentId: string,
  trailId: string,
  status: StudentTrailStatus,
  channel?: TrailChannel,
): Promise<void> {
  await setProgressStatus(db, {
    student_id: studentId,
    trail_id: trailId,
    status,
    channel,
  })
}

export async function completeStudentTrail(
  db: Firestore,
  collectionName: string,
  studentId: string,
  trailId: string,
): Promise<void> {
  await updateStudentTrailStatus(
    db,
    collectionName,
    studentId,
    trailId,
    'completed',
    'whatsapp',
  )
}

export async function blockStudentTrail(
  db: Firestore,
  collectionName: string,
  studentId: string,
  trailId: string,
): Promise<void> {
  await updateStudentTrailStatus(
    db,
    collectionName,
    studentId,
    trailId,
    'blocked',
    'whatsapp',
  )
}

/**
 * Strangler: `update_position` passa a transaction + progress_version++.
 */
export async function updateStudentTrailPosition(
  db: Firestore,
  studentId: string,
  trailId: string,
  patch: {
    current_stage_number?: number
    current_question_number?: number
  },
  options?: { channel?: TrailChannel; idempotency_key?: string },
): Promise<StudentTrailRuntimePosition> {
  const channel = options?.channel ?? 'admin'
  const before = await getStudentTrailPosition(
    db,
    process.env.STUDENT_TRAILS_COLLECTION ?? 'student_trails',
    studentId,
    trailId,
  )
  if (!before) {
    throw new Error('Progresso da trilha não encontrado para este aluno.')
  }

  const targetStage = patch.current_stage_number ?? before.current_stage_number
  const targetQuestion =
    patch.current_question_number ?? before.current_question_number

  const key = resolveLegacyKey({
    headerKey: options?.idempotency_key,
    channel,
    studentId,
    trailId,
    intent: 'update_position',
    stage: before.current_stage_number,
    question: before.current_question_number,
    progress_version: before.progress_version ?? 0,
    extra: `to:${targetStage}:${targetQuestion}`,
  })

  const result = await engineAdvance(db, {
    student_id: studentId,
    trail_id: trailId,
    idempotency_key: key,
    channel,
    reason: 'legacy_update_position',
    set_stage: patch.current_stage_number,
    set_question: patch.current_question_number,
  })

  return {
    student_id: studentId,
    institution_id: before.institution_id,
    trail_id: trailId,
    current_stage_number: result.next_stage_number,
    current_question_number: result.next_question_number,
    status: result.completed ? 'completed' : 'in_progress',
    progress_version: result.progress_version,
  }
}
