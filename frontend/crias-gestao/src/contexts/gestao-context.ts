import { createContext } from 'react'
import type { Institution } from '../types/institution'

export type GestaoContextValue = {
  /** Instituições que o login pode ver (já filtradas por permissão). */
  institutions: Institution[]
  institutionsLoading: boolean
  /** Super admin vê todas as instituições; o perfil Instituição vê só a sua. */
  isSuper: boolean
  /** Instituição do perfil Instituição. Nulo para o Super admin. */
  myInstitutionId: string | null
  /** Filtro global (Super admin): ids marcados em "Filtrar instituições". */
  selectedIds: Set<string>
  setSelectedIds: (next: Set<string>) => void
  /** Instituições que as páginas devem considerar (filtro global ou a própria). */
  scopedInstitutions: Institution[]
  scopedIds: Set<string>
  institutionName: (id: string | null | undefined) => string
}

export const GestaoContext = createContext<GestaoContextValue | null>(null)
