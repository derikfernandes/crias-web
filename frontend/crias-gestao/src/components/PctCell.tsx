/** % com barra (mesmo padrão do Dados). */
export function PctCell({ value, ok }: { value: number | null; ok?: boolean }) {
  if (value == null) return <span>N/A</span>
  return (
    <span className="gx-pctcell">
      <span>{String(value).replace('.', ',')}%</span>
      <span className={ok ? 'gx-pctcell__bar gx-pctcell__bar--ok' : 'gx-pctcell__bar'}>
        <i style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </span>
    </span>
  )
}
