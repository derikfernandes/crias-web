import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export type InstitutionNewPageViewProps = {
  formSlot?: ReactNode
  children?: ReactNode
}

export function InstitutionNewPageView({
  formSlot,
  children,
}: InstitutionNewPageViewProps) {
  return (
    <>
      <header className="admin__header">
        <h1>Nova instituição</h1>
        <p className="admin__lede">
          Após incluir, você será levado à página do registro, com o link
          definitivo.
        </p>
        <p className="admin__actions">
          <Link className="btn btn--ghost" to="/gerenciamento">
            ← Gerenciamento
          </Link>
        </p>
      </header>
      {formSlot ?? children}
    </>
  )
}
