import { describe, expect, it } from 'vitest'
import {
  dashboardAccuracyGate,
  inicioAcertoReady,
} from './dashboardAccuracyGate'

describe('dashboardAccuracyGate (race N/A / Exercícios 0 / parcial)', () => {
  it('durante troca de escopo: loading, não publica N/A', () => {
    const g = dashboardAccuracyGate({
      selectedIdsKey: 'i2\0i4',
      selectedIds: ['i2', 'i4'],
      dataScopeKey: 'i2',
      loadingData: true,
      metaReady: false,
      logsReadyIds: new Set(['i2']),
      loadingLogs: true,
      logsFailed: false,
    })
    expect(g.avgAccuracyLoading).toBe(true)
    expect(g.canPublishAccuracy).toBe(false)
    expect(g.exercisesLoading).toBe(true)
  })

  it('Sol ainda sem summary (só Teste pronto): Carregando, não publica 79%', () => {
    const g = dashboardAccuracyGate({
      selectedIdsKey: 'i2\0i4',
      selectedIds: ['i2', 'i4'],
      dataScopeKey: 'i2\0i4',
      loadingData: false,
      metaReady: true,
      logsReadyIds: new Set(['i4']),
      loadingLogs: true,
      logsFailed: false,
    })
    expect(g.allInstitutionsReady).toBe(false)
    expect(g.avgAccuracyLoading).toBe(true)
    expect(g.canPublishAccuracy).toBe(false)
  })

  it('logs prontos sem meta (stages/questions): Carregando, não N/A', () => {
    const g = dashboardAccuracyGate({
      selectedIdsKey: 'i2',
      selectedIds: ['i2'],
      dataScopeKey: 'i2',
      loadingData: false,
      metaReady: false,
      logsReadyIds: new Set(['i2']),
      loadingLogs: false,
      logsFailed: false,
    })
    expect(g.avgAccuracyLoading).toBe(true)
    expect(g.canPublishAccuracy).toBe(false)
    expect(g.exercisesLoading).toBe(true)
  })

  it('todas prontas: pode publicar', () => {
    const g = dashboardAccuracyGate({
      selectedIdsKey: 'i2\0i4',
      selectedIds: ['i2', 'i4'],
      dataScopeKey: 'i2\0i4',
      loadingData: false,
      metaReady: true,
      logsReadyIds: new Set(['i2', 'i4']),
      loadingLogs: false,
      logsFailed: false,
    })
    expect(g.avgAccuracyLoading).toBe(false)
    expect(g.canPublishAccuracy).toBe(true)
    expect(g.exercisesLoading).toBe(false)
  })

  it('falha sem cache: não fica Carregando nem N/A silencioso', () => {
    const g = dashboardAccuracyGate({
      selectedIdsKey: 'i2',
      selectedIds: ['i2'],
      dataScopeKey: 'i2',
      loadingData: false,
      metaReady: true,
      logsReadyIds: new Set(),
      loadingLogs: false,
      logsFailed: true,
    })
    expect(g.avgAccuracyLoading).toBe(false)
    expect(g.canPublishAccuracy).toBe(false)
  })

  it('Sol só: logs prontos e map vazio = N/A real (não loading)', () => {
    const g = dashboardAccuracyGate({
      selectedIdsKey: 'i1',
      selectedIds: ['i1'],
      dataScopeKey: 'i1',
      loadingData: false,
      metaReady: true,
      logsReadyIds: new Set(['i1']),
      loadingLogs: false,
      logsFailed: false,
    })
    expect(g.avgAccuracyLoading).toBe(false)
    expect(g.canPublishAccuracy).toBe(true)
  })
})

describe('inicioAcertoReady', () => {
  it('exige answerMap em todas as do filtro', () => {
    const maps = new Map<string, Map<string, string>>([
      ['i4', new Map()],
      ['i1', new Map()],
    ])
    expect(inicioAcertoReady(['i1', 'i2', 'i4'], maps)).toBe(false)
    maps.set('i2', new Map([['a', '1']]))
    expect(inicioAcertoReady(['i1', 'i2', 'i4'], maps)).toBe(true)
  })
})
