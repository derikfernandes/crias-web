import type { Timestamp } from 'firebase/firestore'

export interface Student {
  id: string
  institution_id: string
  name: string
  phone_number: string
  /** E-mail do aluno (1.1.1.b). Opcional: só o telefone entra no login. */
  email?: string
  /** Qual dos dois vale para a senha quando há telefone e e-mail (ver lib/loginRule.ts). */
  login_identifier?: 'phone' | 'email'
  school_level: 'fundamental' | 'médio' | string
  school_grade: string
  /** Nível pedagógico atual: 1, 2 (default), 3. */
  student_level: 1 | 2 | 3
  active: boolean
  created_at: Timestamp | null
  updated_at: Timestamp | null
}

