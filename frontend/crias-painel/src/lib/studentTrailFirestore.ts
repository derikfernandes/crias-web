import type {
  DocumentSnapshot,
  QueryDocumentSnapshot,
  Timestamp,
} from 'firebase/firestore'
import type { StudentTrail } from '../types/studentTrail'

export const STUDENT_TRAILS_COLLECTION = 'student_trails'

/** Mesmo formato que `api/lib/studentTrailService.studentTrailDocId`. */
export function studentTrailDocId(studentId: string, trailId: string): string {
  return `${studentId}_trail_${trailId}`
}

function asTimestampOrNull(value: unknown): Timestamp | null {
  if (!value || typeof value !== 'object') return null
  if (
    'toDate' in value &&
    typeof (value as { toDate?: unknown }).toDate === 'function' &&
    'toMillis' in value &&
    typeof (value as { toMillis?: unknown }).toMillis === 'function'
  ) {
    return value as Timestamp
  }
  return null
}

export function snapshotToStudentTrail(
  d: DocumentSnapshot | QueryDocumentSnapshot,
): StudentTrail {
  const data = d.data()
  if (!data) {
    return {
      id: d.id,
      student_id: '',
      institution_id: '',
      trail_id: '',
      current_stage_number: 1,
      current_question_number: 1,
      status: 'not_started',
      started_at: null,
      completed_at: null,
      last_interaction_at: null,
      created_at: null,
      updated_at: null,
    }
  }

  const stageRaw = (data as Record<string, unknown>).current_stage_number
  const questionRaw = (data as Record<string, unknown>).current_question_number

  const current_stage_number =
    typeof stageRaw === 'number' && Number.isFinite(stageRaw) && stageRaw >= 1
      ? stageRaw
      : 1
  const current_question_number =
    typeof questionRaw === 'number' &&
    Number.isFinite(questionRaw) &&
    questionRaw >= 1
      ? questionRaw
      : 1

  const statusRaw = (data as Record<string, unknown>).status
  const status =
    statusRaw === 'in_progress' ||
    statusRaw === 'completed' ||
    statusRaw === 'blocked'
      ? statusRaw
      : 'not_started'

  return {
    id: d.id,
    student_id:
      typeof (data as Record<string, unknown>).student_id === 'string'
        ? ((data as Record<string, unknown>).student_id as string)
        : '',
    institution_id:
      typeof (data as Record<string, unknown>).institution_id === 'string'
        ? ((data as Record<string, unknown>).institution_id as string)
        : '',
    trail_id:
      typeof (data as Record<string, unknown>).trail_id === 'string'
        ? ((data as Record<string, unknown>).trail_id as string)
        : '',
    current_stage_number,
    current_question_number,
    status,
    started_at: asTimestampOrNull((data as Record<string, unknown>).started_at),
    completed_at: asTimestampOrNull(
      (data as Record<string, unknown>).completed_at,
    ),
    last_interaction_at: asTimestampOrNull(
      (data as Record<string, unknown>).last_interaction_at,
    ),
    created_at: asTimestampOrNull((data as Record<string, unknown>).created_at),
    updated_at: asTimestampOrNull((data as Record<string, unknown>).updated_at),
  }
}

