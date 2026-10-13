export function formatPct(v: number | null, fractionDigits = 0): string {
  if (v === null) return '—'
  if (fractionDigits <= 0) return `${v}%`
  return `${v.toLocaleString('pt-BR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}%`
}
