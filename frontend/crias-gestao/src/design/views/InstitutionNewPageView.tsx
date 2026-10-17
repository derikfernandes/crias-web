import type { ReactNode } from 'react'
import { PageHead } from '../gx/ui'

export type InstitutionNewPageViewProps = {
  formSlot?: ReactNode
  children?: ReactNode
}

export function InstitutionNewPageView({ formSlot, children }: InstitutionNewPageViewProps) {
  return (
    <div className="gx-page">
      <PageHead title="Nova instituição" subtitle="Cadastre a escola. Depois você adiciona trilhas e alunos." />
      {formSlot ?? children}
    </div>
  )
}
