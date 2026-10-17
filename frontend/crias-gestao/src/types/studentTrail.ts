import type { Timestamp } from 'firebase/firestore'

export type StudentTrailStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'blocked'

export interface StudentTrail {
  id: string
  student_id: string
  institution_id: string
  trail_id: string
  current_stage_number: number
  current_question_number: number
  status: StudentTrailStatus
  started_at: Timestamp | null
  completed_at: Timestamp | null
  last_interaction_at: Timestamp | null
  created_at: Timestamp | null
  updated_at: Timestamp | null
}

