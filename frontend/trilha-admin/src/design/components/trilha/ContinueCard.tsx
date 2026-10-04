import type { ReactNode } from 'react'
import { TrilhaEmptyState } from './TrilhaEmptyState'

export type ContinueCardProps = {
  title: string
  detail: string
  effort?: string | null
  ctaLabel?: string | null
  canContinue: boolean
  onContinue?: () => void
  homeHint?: 'await_release' | 'blocked' | 'completed' | null
  celebrateAction?: ReactNode
}

export function ContinueCard({
  title,
  detail,
  effort = null,
  ctaLabel = 'Continuar',
  canContinue,
  onContinue,
  homeHint = null,
  celebrateAction = null,
}: ContinueCardProps) {
  if (homeHint === 'await_release') {
    return (
      <div className="trilha-continue-card trilha-continue-card--muted">
        <TrilhaEmptyState
          title="Pausa esperada"
          message="O próximo conteúdo ainda não foi liberado. O seu progresso está seguro — volte mais tarde ou fale com a escola."
        />
      </div>
    )
  }

  if (homeHint === 'blocked') {
    return (
      <div className="trilha-continue-card trilha-continue-card--muted">
        <TrilhaEmptyState
          title="Trilha pausada"
          message="Não é possível continuar neste momento. Fale com a escola."
        />
      </div>
    )
  }

  if (homeHint === 'completed') {
    return (
      <div className="trilha-continue-card trilha-continue-card--done">
        <p className="banner banner--success" role="status">
          Parabéns — concluiu esta trilha.
        </p>
        <p className="trilha-continue-card__detail">{detail}</p>
        {celebrateAction}
      </div>
    )
  }

  return (
    <div className="trilha-continue-card">
      <h2 className="trilha-continue-card__title">{title}</h2>
      <p className="trilha-continue-card__detail">{detail}</p>
      {effort ? <p className="trilha-continue-card__effort muted">{effort}</p> : null}
      {canContinue && ctaLabel && onContinue ? (
        <button
          type="button"
          className="btn btn--primary trilha-cta trilha-continue-card__cta"
          onClick={onContinue}
        >
          {ctaLabel}
        </button>
      ) : null}
    </div>
  )
}
