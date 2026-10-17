import type { ReactNode } from 'react'
import { PageHead } from '../gx/ui'

export type StudentNewPageViewProps = {
  formSlot?: ReactNode
  children?: ReactNode
}

export function StudentNewPageView({ formSlot, children }: StudentNewPageViewProps) {
  return (
    <div className="gx-page">
      <PageHead title="Novo aluno" subtitle="Depois de incluir, você abre o cadastro para vincular trilhas." />
      {formSlot ?? children}
    </div>
  )
}
