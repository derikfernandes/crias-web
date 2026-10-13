import type { Timestamp } from 'firebase/firestore'

export interface Institution {
  id: string
  name: string
  type: string
  active: boolean
  created_at: Timestamp | null
  updated_at: Timestamp | null
  /** URL pública salva no Firestore a cada criação/atualização. */
  public_link?: string
}

export type InstitutionInput = Pick<Institution, 'name' | 'type' | 'active'>
