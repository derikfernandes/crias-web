import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./gestaoAuthHeaders', () => ({
  gestaoAuthHeaders: vi.fn(async () => ({
    Accept: 'application/json',
    Authorization: 'Bearer unit-token',
  })),
}))

import { gestaoAuthHeaders } from './gestaoAuthHeaders'
import { fetchDashboardLogSummary } from './dashboardSummaryApi'

describe('fetchDashboardLogSummary auth', () => {
  beforeEach(() => {
    vi.mocked(gestaoAuthHeaders).mockClear()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            trail_ids: ['t1'],
            students: {},
            agent_usage: {
              period_days: 30,
              total_messages: 0,
              agents: [],
              series: [],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )
  })

  it('chama a API com Bearer do login da Gestão', async () => {
    await fetchDashboardLogSummary('i2', 30)
    expect(gestaoAuthHeaders).toHaveBeenCalled()
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/dashboard_summary'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer unit-token',
        }),
      }),
    )
    const url = String(vi.mocked(fetch).mock.calls[0]?.[0] ?? '')
    expect(url).toContain('institution_id=i2')
    expect(url).toContain('period_days=30')
  })
})
