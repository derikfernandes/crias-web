import { Link } from 'react-router-dom'
import type { TrailNewPageViewProps } from '../types/trailNewPageView'

export type { TrailNewPageViewProps } from '../types/trailNewPageView'

export function TrailNewPageView({
  institutionLabel,
  hasInstitution,
  formSlot,
}: TrailNewPageViewProps) {
  return (
    <>
      <header className="admin__header">
        <div className="trail-new-header__top-row">
          <p className="trail-new-header__left">
            <Link className="btn btn--ghost" to="/gerenciamento">
              ← Gerenciamento
            </Link>
          </p>
          <h1 className="trail-new-header__title">Nova trilha</h1>
          <p className="trail-new-header__institution muted">{institutionLabel}</p>
        </div>
        <p className="admin__lede muted">
          Preencha o cadastro da trilha. Gerar a partir de material e o
          assistente em etapas ficam para fases posteriores.
        </p>
      </header>
      {hasInstitution ? (
        formSlot
      ) : (
        <section className="panel">
          <p className="banner banner--error" role="alert">
            Selecione uma instituição em Gerenciamento para criar a trilha.
          </p>
        </section>
      )}
    </>
  )
}
