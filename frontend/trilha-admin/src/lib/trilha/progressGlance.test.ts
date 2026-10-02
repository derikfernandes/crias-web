import { describe, expect, it } from 'vitest'
import { glanceDoneSummary, glanceNowLabel } from './progressGlance'

describe('glanceDoneSummary', () => {
  it('em progresso: etapas anteriores ao cursor (stage-1)', () => {
    expect(
      glanceDoneSummary({ stageNumber: 2, totalStages: 4, completed: false }),
    ).toBe('1 de 4 etapas concluídas.')
    expect(
      glanceDoneSummary({ stageNumber: 4, totalStages: 4, completed: false }),
    ).toBe('3 de 4 etapas concluídas.')
  })

  it('completed: mostra total de total (não stage-1)', () => {
    // Fixture home-done: cursor na etapa 4, mas trilha 100% — P0 UX Ciclo 5
    expect(
      glanceDoneSummary({ stageNumber: 4, totalStages: 4, completed: true }),
    ).toBe('4 de 4 etapas concluídas.')
    expect(
      glanceDoneSummary({ stageNumber: 1, totalStages: 4, completed: true }),
    ).toBe('4 de 4 etapas concluídas.')
  })

  it('completed sem totalStages: todas as etapas', () => {
    expect(glanceDoneSummary({ stageNumber: 3, completed: true })).toBe(
      'Todas as etapas concluídas.',
    )
  })

  it('começo da trilha', () => {
    expect(
      glanceDoneSummary({ stageNumber: 1, totalStages: 4, completed: false }),
    ).toBe('Ainda no começo — nenhuma etapa concluída.')
  })
})

describe('glanceNowLabel', () => {
  it('completed: Trilha concluída (sem Etapa N residual)', () => {
    expect(
      glanceNowLabel({
        stageNumber: 4,
        questionNumber: 4,
        statusLabel: 'Concluída',
        completed: true,
      }),
    ).toEqual({ primary: 'Trilha concluída', status: null })
  })

  it('em progresso: Etapa · Questão + status', () => {
    expect(
      glanceNowLabel({
        stageNumber: 2,
        questionNumber: 1,
        statusLabel: 'Em progresso',
        completed: false,
      }),
    ).toEqual({
      primary: 'Etapa 2 · Questão 1',
      status: 'Em progresso',
    })
  })
})
