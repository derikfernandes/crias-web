import type { ReactNode } from 'react'

export function PageLoading({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="crias-state" role="status" aria-live="polite">
      <p className="crias-state__title">{label}</p>
      <div className="crias-skeleton" aria-hidden="true">
        <div className="crias-skeleton__row" />
        <div className="crias-skeleton__row" style={{ width: '70%' }} />
        <div className="crias-skeleton__row" style={{ width: '55%' }} />
      </div>
    </div>
  )
}

export function PageEmpty({
  title,
  body,
}: {
  title: string
  body?: string
}) {
  return (
    <div className="crias-state">
      <p className="crias-state__title">{title}</p>
      {body ? <p className="crias-state__body">{body}</p> : null}
    </div>
  )
}

export function PageError({
  title,
  body,
  onRetry,
}: {
  title: string
  body?: string
  onRetry?: () => void
}) {
  return (
    <div className="crias-state" role="alert">
      <p className="crias-state__title">{title}</p>
      {body ? <p className="crias-state__body">{body}</p> : null}
      {onRetry ? (
        <button type="button" className="btn btn--primary" onClick={onRetry}>
          Tentar novamente
        </button>
      ) : null}
    </div>
  )
}

export function PageSection({
  eyebrow,
  title,
  action,
  children,
}: {
  eyebrow?: string
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="crias-journey" style={{ marginBottom: 40 }}>
      <div className="crias-journey__head">
        <div>
          {eyebrow ? <div className="crias-label">{eyebrow}</div> : null}
          <h2 className="crias-section-title" style={{ borderBottom: 0, paddingBottom: 0 }}>
            {title}
          </h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
