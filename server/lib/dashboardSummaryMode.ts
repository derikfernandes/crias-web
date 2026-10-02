/**
 * Modo de agregação de GET /api/dashboard_summary.
 *
 * - `full` (padrão): resposta atual — progressão + agent_usage.
 * - `kpis`: payload leve — contagens + agent_usage, sem mapa `students`.
 *
 * Ausência / valor desconhecido → `full` (compatível com clientes do main).
 */

export type DashboardSummaryMode = 'full' | 'kpis'

export function parseDashboardSummaryMode(
  raw: string | null | undefined,
): DashboardSummaryMode {
  const value = (raw ?? '').trim().toLowerCase()
  if (value === 'kpis') return 'kpis'
  return 'full'
}
