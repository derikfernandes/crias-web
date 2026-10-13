import type { Timestamp } from 'firebase/firestore'

export type ConversationLogSender = 'system' | 'student'

export type ConversationLogMessageType =
  | 'text'
  | 'instruction'
  | 'exercise'
  | 'feedback'

export interface ConversationLog {
  id: string
  student_id: string
  trail_id: string
  stage_number: number
  question_number: number
  sender: ConversationLogSender
  message_text: string
  institution_id: string | null
  message_type: ConversationLogMessageType | null
  metadata: Record<string, unknown> | null
  created_at: Timestamp | null
  /** Preenchido no POST: data/hora de criação em America/Sao_Paulo (YYYY-MM-DDTHH:mm:ss). */
  created_at_brasilia: string | null
}

