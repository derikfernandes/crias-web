import type { Timestamp } from 'firebase/firestore'

export interface Student {
  id: string
  institution_id: string
  name: string
  phone_number: string
  /** E-mail do aluno (1.1.1.b). Com telefone e e-mail, os dois autenticam. */
  email?: string
  /** Preferência legada/UI; não bloqueia o outro canal (ver lib/loginRule.ts). */
  login_identifier?: 'phone' | 'email'
  /** Tag/agrupamento opcional (ex.: "7A"). Vazio/ausente = sem turma. */
  turma?: string
  school_level: 'fundamental' | 'médio' | string
  school_grade: string
  /** Nível pedagógico atual: 1, 2 (default), 3. */
  student_level: 1 | 2 | 3
  active: boolean
  created_at: Timestamp | null
  updated_at: Timestamp | null
}

