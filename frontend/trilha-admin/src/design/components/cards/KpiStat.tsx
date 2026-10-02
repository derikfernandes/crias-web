import type { ReactNode } from 'react'

export type KpiBarTone = 'green' | 'yellow' | 'amber' | 'rose'

export type KpiStatProps = {
  label: string
  value: string
  hint?: string
  barPct?: number | null
  icon?: ReactNode
  barTone?: KpiBarTone
  /** Indica refetch (ex.: troca de período). */
  loading?: boolean
  /** Card selecionado (abre o painel de detalhes abaixo). */
  selected?: boolean
  /** Torna o card clicável. */
  onSelect?: () => void
  detailLabel?: string
}

export function kpiBarToneFromPct(pct: number | null | undefined): KpiBarTone {
  if (pct == null || Number.isNaN(pct)) return 'green'
  if (pct >= 70) return 'green'
  if (pct >= 50) return 'amber'
  if (pct >= 30) return 'yellow'
  return 'rose'
}

export function KpiStat({
  label,
  value,
  hint,
  barPct,
  icon,
  barTone,
  loading = false,
  selected = false,
  onSelect,
  detailLabel,
}: KpiStatProps) {
  const width =
    barPct == null || Number.isNaN(barPct)
      ? null
      : Math.max(0, Math.min(100, barPct))
  const tone = barTone ?? kpiBarToneFromPct(width)
  const classes = [
    'crias-kpi',
    loading ? 'crias-kpi--loading' : '',
    selected ? 'crias-kpi--selected' : '',
    onSelect ? 'crias-kpi--interactive' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const body = (
    <>
      <span className="crias-kpi__head">
        {icon ? (
          <span className="crias-kpi__icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span className="crias-kpi__label">{label}</span>
      </span>
      <span className="crias-kpi__value">{value}</span>
      {width != null ? (
        <div
          className={`crias-kpi__bar crias-kpi__bar--${tone}`}
          aria-hidden="true"
        >
          <span style={{ width: `${width}%` }} />
        </div>
      ) : null}
      {hint ? <span className="crias-kpi__hint">{hint}</span> : null}
      {onSelect ? (
        <span className="crias-kpi__detail">
          {detailLabel ?? (selected ? 'Ocultar ˄' : 'Ver detalhes ›')}
        </span>
      ) : null}
    </>
  )

  if (onSelect) {
    return (
      <button
        type="button"
        className={classes}
        aria-busy={loading || undefined}
        aria-pressed={selected}
        onClick={onSelect}
      >
        {body}
      </button>
    )
  }

  return (
    <div className={classes} aria-busy={loading || undefined}>
      {body}
    </div>
  )
}

export function KpiGrid({ children }: { children: ReactNode }) {
  return <div className="crias-kpi-grid">{children}</div>
}
