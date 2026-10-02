export type CriasTabItem = {
  id: string
  label: string
}

export type CriasTabsProps = {
  items: CriasTabItem[]
  activeId: string
  onChange: (id: string) => void
  ariaLabel?: string
}

export function CriasTabs({
  items,
  activeId,
  onChange,
  ariaLabel = 'Abas',
}: CriasTabsProps) {
  return (
    <div className="crias-tabs" role="tablist" aria-label={ariaLabel}>
      {items.map((item) => {
        const active = item.id === activeId
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={
              active ? 'crias-tabs__btn crias-tabs__btn--active' : 'crias-tabs__btn'
            }
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
