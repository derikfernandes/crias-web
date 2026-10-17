import type { Timestamp } from 'firebase/firestore'

export interface Student {
  id: string
  institution_id: string
  name: string
  phone_number: string
  school_level: 'fundamental' | 'médio' | string
  school_grade: string
  /** Nível pedagógico atual: 1, 2 (default), 3. */
  student_level: 1 | 2 | 3
  active: boolean
  created_at: Timestamp | null
  updated_at: Timestamp | null
}

