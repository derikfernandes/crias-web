import { describe, expect, it } from 'vitest'
import { parseDashboardSummaryMode } from './dashboardSummaryMode'

describe('parseDashboardSummaryMode', () => {
  it('default e valores desconhecidos → full (não-breaking)', () => {
    expect(parseDashboardSummaryMode(null)).toBe('full')
    expect(parseDashboardSummaryMode(undefined)).toBe('full')
    expect(parseDashboardSummaryMode('')).toBe('full')
    expect(parseDashboardSummaryMode('full')).toBe('full')
    expect(parseDashboardSummaryMode('FULL')).toBe('full')
    expect(parseDashboardSummaryMode('nope')).toBe('full')
  })

  it('aceita kpis', () => {
    expect(parseDashboardSummaryMode('kpis')).toBe('kpis')
    expect(parseDashboardSummaryMode('KPIS')).toBe('kpis')
    expect(parseDashboardSummaryMode(' kpis ')).toBe('kpis')
  })
})
