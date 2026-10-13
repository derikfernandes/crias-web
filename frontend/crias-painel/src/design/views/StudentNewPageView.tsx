import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export type StudentNewPageViewProps = {
  formSlot?: ReactNode
  children?: ReactNode
}

export function StudentNewPageView({
  formSlot,
  children,
}: StudentNewPageViewProps) {
  return (
    <>
      <header className="admin__header">
        <h1>Novo aluno</h1>
        <p className="admin__lede">
          Após incluir, você será levado à página do registro para edição.
        </p>
        <p className="admin__actions">
          <Link className="btn btn--ghost" to="/">
            ← Voltar ao início
          </Link>
        </p>
      </header>
      {formSlot ?? children}
    </>
  )
}
