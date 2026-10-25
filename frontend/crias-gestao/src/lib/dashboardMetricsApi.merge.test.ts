import { describe, expect, it } from 'vitest'
import {
  mergeMetricsViews,
  type InstitutionDashboardMetricsView,
} from './dashboardMetricsApi'

function stub(
  partial: Partial<InstitutionDashboardMetricsView> & {
    institutionId: string
  },
): InstitutionDashboardMetricsView {
  return {
    computedAt: 1,
    activeStudents: 0,
    activeTrails: 0,
    avgCompletion: null,
    avgLessonCompletion: null,
    completionDone: 0,
    completionReleased: 0,
    lessonCompletionDone: 0,
    lessonCompletionReleased: 0,
    avgAccuracy: null,
    accuracyCorrect: 0,
    accuracyTried: 0,
    exerciseCount: 0,
    worstPills: [],
    bestPills: [],
    exercisePills: [],
    stageBars: [],
    students: [],
    agentUsageByPeriod: {},
    ...partial,
  }
}

describe('mergeMetricsViews', () => {
  it('conclui com Σ done / Σ released (ponderado), não média das %', () => {
    // Teste 25,9% · Sol 38,2% · Crias 23,5% — pesos distintos.
    const teste = stub({
      institutionId: 'i1',
      activeStudents: 10,
      completionDone: 259,
      completionReleased: 1000,
      avgCompletion: 25.9,
    })
    const sol = stub({
      institutionId: 'i2',
      activeStudents: 400,
      completionDone: 3820,
      completionReleased: 10000,
      avgCompletion: 38.2,
      // students vazios (sidecar): merge deve usar escalares.
      students: [],
    })
    const crias = stub({
      institutionId: 'i4',
      activeStudents: 20,
      completionDone: 235,
      completionReleased: 1000,
      avgCompletion: 23.5,
    })
    const merged = mergeMetricsViews([teste, sol, crias])
    // (259+3820+235) / (1000+10000+1000) = 4314/12000 = 35,95 → 36,0
    expect(merged.completionDone).toBe(4314)
    expect(merged.completionReleased).toBe(12000)
    expect(merged.avgCompletion).toBe(36)
    // Não é a média aritmética das % (~29,2) nem só Sol (38,2).
    expect(merged.avgCompletion).not.toBe(38.2)
  })
})
