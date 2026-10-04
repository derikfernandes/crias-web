import type {
  DocumentSnapshot,
  Firestore,
} from 'firebase-admin/firestore'
import { FieldValue } from 'firebase-admin/firestore'

import type {
  StudentTrailCreatePayload,
  StudentTrailStatus,
} from './studentTrailValidation'

export type StudentTrailRuntimePosition = {
  student_id: string
  institution_id: string
  trail_id: string
  current_stage_number: number
  current_question_number: number
  status: StudentTrailStatus
  /** Optimistic lock (C2-R22 N02); ausente no doc legado → 0. */
  progress_version: number
}

export function studentTrailDocId(studentId: string, trailId: string): string {
  return `${studentId}_trail_${trailId}`
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
      progress_version: 0,
      completed_at: null,
      last_interaction_at: null,
      created_at: now,
      updated_at: now,
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
  if (!snap.exists) return null
  const data = (snap.data() ?? {}) as Record<string, unknown>

  const student_id =
    typeof data.student_id === 'string' ? data.student_id : studentId
  const institution_id =
    typeof data.institution_id === 'string' ? data.institution_id : ''
  const trail_id =
    typeof data.trail_id === 'string' ? data.trail_id : trailId

  const stageRaw = data.current_stage_number
  const questionRaw = data.current_question_number

  const current_stage_number =
    typeof stageRaw === 'number' && Number.isFinite(stageRaw)
      ? stageRaw
      : 1
  const current_question_number =
    typeof questionRaw === 'number' && Number.isFinite(questionRaw)
      ? questionRaw
      : 1

  const statusRaw =
    typeof data.status === 'string' ? data.status : 'not_started'
  const status: StudentTrailStatus =
    statusRaw === 'in_progress' ||
    statusRaw === 'completed' ||
    statusRaw === 'blocked'
      ? (statusRaw as StudentTrailStatus)
      : 'not_started'

  const versionRaw = data.progress_version
  const progress_version =
    typeof versionRaw === 'number' &&
    Number.isFinite(versionRaw) &&
    versionRaw >= 0
      ? Math.trunc(versionRaw)
      : 0

  return {
    student_id,
    institution_id,
    trail_id,
    current_stage_number,
    current_question_number,
    status,
    progress_version,
  }
}

export async function advanceStudentTrailQuestion(
  db: Firestore,
  collectionName: string,
  studentId: string,
  trailId: string,
): Promise<StudentTrailRuntimePosition> {
  const id = studentTrailDocId(studentId, trailId)
  const ref = db.collection(collectionName).doc(id)
  const now = FieldValue.serverTimestamp()

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) {
      throw new Error('Progresso da trilha não encontrado para este aluno.')
    }
    const data = (snap.data() ?? {}) as Record<string, unknown>

    const status = (typeof data.status === 'string'
      ? data.status
      : 'not_started') as StudentTrailStatus

    if (status === 'completed' || status === 'blocked') {
      throw new Error(
        `Não é possível avançar questão quando o status é "${status}".`,
      )
    }

    const stageRaw = data.current_stage_number
    const questionRaw = data.current_question_number

    const current_stage_number =
      typeof stageRaw === 'number' && Number.isFinite(stageRaw)
        ? stageRaw
        : 1
    const nextQuestion =
      typeof questionRaw === 'number' && Number.isFinite(questionRaw)
        ? questionRaw + 1
        : 2

    const patch: Record<string, unknown> = {
      current_stage_number,
      current_question_number: nextQuestion,
      last_interaction_at: now,
      updated_at: now,
    }

    if (status === 'not_started') {
      patch.status = 'in_progress'
      if (!data.started_at) {
        patch.started_at = now
      }
    }

    tx.update(ref, patch)

    const institution_id =
      typeof data.institution_id === 'string' ? data.institution_id : ''
    const trail_id =
      typeof data.trail_id === 'string' ? data.trail_id : trailId

    const newStatus =
      (patch.status as StudentTrailStatus | undefined) ?? status

    const versionRaw = data.progress_version
    const progress_version =
      typeof versionRaw === 'number' &&
      Number.isFinite(versionRaw) &&
      versionRaw >= 0
        ? Math.trunc(versionRaw)
        : 0

    const pos: StudentTrailRuntimePosition = {
      student_id: studentId,
      institution_id,
      trail_id,
      current_stage_number,
      current_question_number: nextQuestion,
      status: newStatus,
      progress_version,
    }
    return pos
  })

  return result
}

export async function advanceStudentTrailStage(
  db: Firestore,
  collectionName: string,
  studentId: string,
  trailId: string,
): Promise<StudentTrailRuntimePosition> {
  const id = studentTrailDocId(studentId, trailId)
  const ref = db.collection(collectionName).doc(id)
  const now = FieldValue.serverTimestamp()

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) {
      throw new Error('Progresso da trilha não encontrado para este aluno.')
    }
    const data = (snap.data() ?? {}) as Record<string, unknown>

    const status = (typeof data.status === 'string'
      ? data.status
      : 'not_started') as StudentTrailStatus

    if (status === 'completed' || status === 'blocked') {
      throw new Error(
        `Não é possível avançar stage quando o status é "${status}".`,
      )
    }

    const stageRaw = data.current_stage_number

    const nextStage =
      typeof stageRaw === 'number' && Number.isFinite(stageRaw)
        ? stageRaw + 1
        : 2

    const questionRaw = data.current_question_number
    const current_question_number =
      typeof questionRaw === 'number' &&
      Number.isFinite(questionRaw) &&
      questionRaw >= 1
        ? questionRaw
        : 1

    const patch: Record<string, unknown> = {
      current_stage_number: nextStage,
      last_interaction_at: now,
      updated_at: now,
    }

    if (status === 'not_started') {
      patch.status = 'in_progress'
      if (!data.started_at) {
        patch.started_at = now
      }
    }

    tx.update(ref, patch)

    const institution_id =
      typeof data.institution_id === 'string' ? data.institution_id : ''
    const trail_id =
      typeof data.trail_id === 'string' ? data.trail_id : trailId

    const newStatus =
      (patch.status as StudentTrailStatus | undefined) ?? status

    const versionRaw = data.progress_version
    const progress_version =
      typeof versionRaw === 'number' &&
      Number.isFinite(versionRaw) &&
      versionRaw >= 0
        ? Math.trunc(versionRaw)
        : 0

    const pos: StudentTrailRuntimePosition = {
      student_id: studentId,
      institution_id,
      trail_id,
      current_stage_number: nextStage,
      current_question_number,
      status: newStatus,
      progress_version,
    }
    return pos
  })

  return result
}

export async function markStudentTrailLastInteraction(
  db: Firestore,
  collectionName: string,
  studentId: string,
  trailId: string,
): Promise<void> {
  const id = studentTrailDocId(studentId, trailId)
  await updateStudentTrailFields(db, collectionName, id, {
    last_interaction_at: FieldValue.serverTimestamp(),
  })
}

export async function updateStudentTrailStatus(
  db: Firestore,
  collectionName: string,
  studentId: string,
  trailId: string,
  status: StudentTrailStatus,
): Promise<void> {
  const id = studentTrailDocId(studentId, trailId)
  const ref = db.collection(collectionName).doc(id)
  const now = FieldValue.serverTimestamp()

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) {
      throw new Error('Progresso da trilha não encontrado para este aluno.')
    }
    const data = (snap.data() ?? {}) as Record<string, unknown>

    const patch: Record<string, unknown> = {
      status,
      updated_at: now,
    }

    if (status === 'in_progress' || status === 'completed') {
      if (!data.started_at) {
        patch.started_at = now
      }
    }

    if (status === 'completed') {
      patch.completed_at = now
    }

    tx.update(ref, patch)
  })
}

export async function completeStudentTrail(
  db: Firestore,
  collectionName: string,
  studentId: string,
  trailId: string,
): Promise<void> {
  const id = studentTrailDocId(studentId, trailId)
  const ref = db.collection(collectionName).doc(id)
  const now = FieldValue.serverTimestamp()

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) {
      throw new Error('Progresso da trilha não encontrado para este aluno.')
    }
    const data = (snap.data() ?? {}) as Record<string, unknown>

    const patch: Record<string, unknown> = {
      status: 'completed',
      completed_at: now,
      last_interaction_at: now,
      updated_at: now,
    }

    if (!data.started_at) {
      patch.started_at = now
    }

    tx.update(ref, patch)
  })
}

export async function blockStudentTrail(
  db: Firestore,
  collectionName: string,
  studentId: string,
  trailId: string,
): Promise<void> {
  await updateStudentTrailStatus(db, collectionName, studentId, trailId, 'blocked')
}

