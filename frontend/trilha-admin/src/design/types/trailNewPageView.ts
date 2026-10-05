import type { ReactNode } from 'react'

export type TrailNewPageViewProps = {
  institutionLabel: string
  hasInstitution: boolean
  /** Slot principal (formulário manual ou wizard IA). */
  formSlot?: ReactNode
  /** Escolha de modo (manual vs IA), acima do formulário. */
  modeSlot?: ReactNode
}
