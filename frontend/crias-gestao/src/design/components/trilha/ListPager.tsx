export type ListPagerProps = {
  page: number
  totalPages: number
  totalItems: number
  onPageChange: (page: number) => void
  label?: string
}

export function ListPager({
  page,
  totalPages,
  totalItems,
  onPageChange,
  label = 'Página',
}: ListPagerProps) {
  if (totalPages <= 1 || totalItems === 0) return null

  return (
    <nav
      className="trilha-pager"
      aria-label={`${label} — navegação`}
    >
      <button
        type="button"
        className="btn btn--ghost btn--small trilha-pager__btn"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Anterior
      </button>
      <span className="trilha-pager__status muted">
        {label} {page} de {totalPages}
      </span>
      <button
        type="button"
        className="btn btn--ghost btn--small trilha-pager__btn"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Próxima
      </button>
    </nav>
  )
}
