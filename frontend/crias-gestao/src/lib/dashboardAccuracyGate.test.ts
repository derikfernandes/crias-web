import { describe, expect, it } from 'vitest'
import { dashboardAccuracyGate } from './dashboardAccuracyGate'

describe('dashboardAccuracyGate (race N/A / Exercícios 0)', () => {
  it('durante troca de escopo: loading, não publica N/A', () => {
    const g = dashboardAccuracyGate({
      selectedIdsKey: 'i2\0i4',
      dataScopeKey: 'i2', // ainda o escopo anterior
      logsScopeKey: 'i2',
      loadingData: true,
      loadingLogs: true,
      answerMapSize: 100,
    })
    expect(g.avgAccuracyLoading).toBe(true)
    expect(g.canPublishAccuracy).toBe(false)
    expect(g.exercisesLoading).toBe(true)
  })

  it('dados ok mas logs ainda subindo com map vazio: Carregando', () => {
    const g = dashboardAccuracyGate({
      selectedIdsKey: 'i2\0i4',
      dataScopeKey: 'i2\0i4',
      logsScopeKey: '',
      loadingData: false,
      loadingLogs: true,
      answerMapSize: 0,
    })
    expect(g.avgAccuracyLoading).toBe(true)
    expect(g.canPublishAccuracy).toBe(false)
    expect(g.exercisesLoading).toBe(true)
  })

  it('cache hit de logs no novo escopo: pode publicar', () => {
    const g = dashboardAccuracyGate({
      selectedIdsKey: 'i2\0i4',
      dataScopeKey: 'i2\0i4',
      logsScopeKey: 'i2\0i4',
      loadingData: false,
      loadingLogs: false,
      answerMapSize: 50000,
    })
    expect(g.avgAccuracyLoading).toBe(false)
    expect(g.canPublishAccuracy).toBe(true)
    expect(g.exercisesLoading).toBe(false)
  })

  it('logs prontos e map vazio: N/A real (não loading)', () => {
    const g = dashboardAccuracyGate({
      selectedIdsKey: 'i1',
      dataScopeKey: 'i1',
      logsScopeKey: 'i1',
      loadingData: false,
      loadingLogs: false,
      answerMapSize: 0,
    })
    expect(g.avgAccuracyLoading).toBe(false)
    expect(g.canPublishAccuracy).toBe(true)
  })
})
