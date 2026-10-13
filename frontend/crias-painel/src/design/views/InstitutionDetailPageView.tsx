import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export type InstitutionDetailPageStatus =
  | 'ok'
  | 'loading'
  | 'forbidden'
  | 'missing-id'
  | 'not-found'
  | 'error'

export type InstitutionDetailPageViewProps = {
  status: InstitutionDetailPageStatus
  errorMessage?: string | null
  formSlot?: ReactNode
  children?: ReactNode
}

/**
 * `loading` = carregando permissões (sem shell).
 * Carregamento de dados: use `status="ok"` com `formSlot` de loading.
 * `error` / `not-found` / `ok` renderizam o header + corpo correspondente.
 */
export function InstitutionDetailPageView({
  status,
  errorMessage = null,
  formSlot,
  children,
}: InstitutionDetailPageViewProps) {
  if (status === 'missing-id') {
    return (
      <p className="banner banner--error" role="alert">
        ID ausente na URL.
      </p>
    )
  }

  if (status === 'loading') {
    return <p className="muted">Carregando permissões…</p>
  }

  if (status === 'forbidden') {
    return (
      <p className="banner banner--error" role="alert">
        Você não tem permissão para acessar esta instituição.
      </p>
    )
  }

  const slot = formSlot ?? children

  return (
    <>
      <header className="admin__header">
        <h1>Instituição</h1>
        <p className="admin__actions">
          <Link className="btn btn--ghost" to="/gerenciamento">
            ← Gerenciamento
          </Link>
        </p>
      </header>

      {errorMessage ? (
        <p className="banner banner--error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {status === 'ok' ? slot : null}

      {status === 'not-found' || (status === 'error' && !slot) ? (
        <p className="banner banner--error" role="alert">
          Registro não encontrado.
        </p>
      ) : null}

      {status === 'error' && slot ? slot : null}
    </>
  )
}
