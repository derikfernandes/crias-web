export type TrilhaErrorBannerProps = {
  message: string
  onRetry?: () => void
}

export function TrilhaErrorBanner({ message, onRetry }: TrilhaErrorBannerProps) {
  return (
    <div className="banner banner--error trilha-error" role="alert">
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="btn btn--ghost btn--small" onClick={onRetry}>
          Tentar de novo
        </button>
      ) : null}
    </div>
  )
}
