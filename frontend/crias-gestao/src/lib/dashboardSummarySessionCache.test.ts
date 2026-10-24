import { beforeEach, describe, expect, it } from 'vitest'
import { EMPTY_AGENT_USAGE } from './agentUsage'
import {
  clearSummarySessionCache,
  mergeSessionAgentUsage,
  mergeSessionAnswerMaps,
  setSummarySession,
} from './dashboardSummarySessionCache'
import type { DashboardLogSummary } from './dashboardSummaryApi'

function summary(
  answers: Array<[string, string]>,
  totalMessages: number,
): DashboardLogSummary {
  return {
    doneByStudent: new Map(),
    answerMap: new Map(answers),
    agentUsage: { ...EMPTY_AGENT_USAGE, periodDays: 0, totalMessages },
    agentUsagePresent: true,
    agentUsageByPeriod: {
      0: { ...EMPTY_AGENT_USAGE, periodDays: 0, totalMessages },
      7: {
        ...EMPTY_AGENT_USAGE,
        periodDays: 7,
        totalMessages: Math.min(totalMessages, 300),
      },
      30: {
        ...EMPTY_AGENT_USAGE,
        periodDays: 30,
        totalMessages: Math.min(totalMessages, 2000),
      },
    },
  }
}

describe('dashboardSummarySessionCache', () => {
  beforeEach(() => clearSummarySessionCache())

  it('Sol+Teste só fica complete quando as duas estão na sessão', () => {
    setSummarySession('i2', summary([['s|t|1|1', '1']], 17814), 0)
    let m = mergeSessionAnswerMaps(['i2', 'i4'])
    expect(m.readyIds).toEqual(['i2'])
    expect(m.missingIds).toEqual(['i4'])
    setSummarySession('i4', summary([['x|t|1|1', '2']], 22), 0)
    m = mergeSessionAnswerMaps(['i2', 'i4'])
    expect(m.missingIds).toEqual([])
    expect(m.answerMap.size).toBe(2)
    const agent = mergeSessionAgentUsage(['i2', 'i4'], 0)
    expect(agent.complete).toBe(true)
    expect(agent.usage.totalMessages).toBe(17836)
  })

  it('troca de período usa agent_usage_by_period sem refetch de answerMap', () => {
    setSummarySession('i2', summary([['a', '1']], 17814), 0)
    const p7 = mergeSessionAgentUsage(['i2'], 7)
    expect(p7.complete).toBe(true)
    expect(p7.usage.totalMessages).toBe(300)
    const maps = mergeSessionAnswerMaps(['i2'])
    expect(maps.answerMap.size).toBe(1)
  })
})
