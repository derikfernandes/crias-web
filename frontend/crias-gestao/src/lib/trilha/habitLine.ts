/**
 * Hábito leve (Ciclo 5) — sem streak punitivo.
 * Usa attempted_at do histórico do motor quando disponível.
 */

export function habitLineFromAttempts(
  attemptedAts: Array<string | null | undefined>,
  now = new Date(),
): string | null {
  const dates = attemptedAts
    .map((s) => {
      if (!s) return null
      const d = new Date(s)
      return Number.isNaN(d.getTime()) ? null : d
    })
    .filter((d): d is Date => d != null)

  if (dates.length === 0) {
    return 'Quando quiser: uma etapa curta (~3–5 min). Sem pressão de sequência.'
  }

  const y = now.getFullYear()
  const m = now.getMonth()
  const day = now.getDate()
  const todayCount = dates.filter(
    (d) => d.getFullYear() === y && d.getMonth() === m && d.getDate() === day,
  ).length

  if (todayCount > 0) {
    return `Hoje: ${todayCount} etapa${todayCount === 1 ? '' : 's'} registada${todayCount === 1 ? '' : 's'}.`
  }
  return 'Ainda sem etapa hoje: cerca de 3 a 5 min quando puder.'
}
