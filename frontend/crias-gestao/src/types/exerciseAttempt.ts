import type { Timestamp } from 'firebase/firestore'

export interface ExerciseAttempt {
  id: string
  student_id: string
  institution_id: string
  trail_id: string
  stage_number: number
  question_number: number
  student_answer: string
  correct_option: string
  is_correct: boolean
  score: number | null
  feedback: string | null
  attempt_number: number
  attempted_at: Timestamp | null
  created_at: Timestamp | null
  updated_at: Timestamp | null
}

