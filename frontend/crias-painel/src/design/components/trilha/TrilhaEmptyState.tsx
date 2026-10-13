import { TrilhaPathIcon } from '../../icons/trilha/TrilhaPathIcon'

export type TrilhaEmptyStateProps = {
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
}

export function TrilhaEmptyState({
  title,
  message,
  actionLabel,
  onAction,
}: TrilhaEmptyStateProps) {
  return (
    <div className="trilha-empty" role="status">
      <TrilhaPathIcon size={32} className="trilha-empty__icon" />
      <h2 className="trilha-empty__title">{title}</h2>
      <p className="trilha-empty__message">{message}</p>
      {actionLabel && onAction ? (
        <button type="button" className="btn btn--ghost" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}
