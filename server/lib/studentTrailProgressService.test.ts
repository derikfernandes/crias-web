import { describe, expect, it } from 'vitest'

import {
  computeNextPosition,
  evaluateContentAvailability,
} from './studentTrailProgressService'

describe('computeNextPosition (trail_progression)', () => {
  it('avança stage quando ainda não chegou ao último', () => {
    expect(
      computeNextPosition({
        current_stage_number: 3,
        current_question_number: 1,
        total_stages: 8,
        total_questions: 10,
      }),
    ).toEqual({
      next_stage_number: 4,
      next_question_number: 1,
      completed: false,
    })
  })

  it('reseta stage e avança questão ao final da etapa', () => {
    expect(
      computeNextPosition({
        current_stage_number: 8,
        current_question_number: 1,
        total_stages: 8,
        total_questions: 10,
      }),
    ).toEqual({
      next_stage_number: 1,
      next_question_number: 2,
      completed: false,
    })
  })

  it('marca concluído quando acaba última questão', () => {
    expect(
      computeNextPosition({
        current_stage_number: 8,
        current_question_number: 10,
        total_stages: 8,
        total_questions: 10,
      }),
    ).toEqual({
      next_stage_number: 8,
      next_question_number: 10,
      completed: true,
    })
  })
})

describe('evaluateContentAvailability (student_player)', () => {
  it('busca próximo conteúdo liberado', () => {
    expect(evaluateContentAvailability({ is_released: true })).toBe('ok')
  })

  it('bloqueia conteúdo não liberado', () => {
    expect(evaluateContentAvailability({ is_released: false })).toBe('blocked')
  })

  it('bloqueia stage ou questão inativos', () => {
    expect(
      evaluateContentAvailability({
        is_released: true,
        active_stage: false,
      }),
    ).toBe('blocked')
    expect(
      evaluateContentAvailability({
        is_released: true,
        active_question: false,
      }),
    ).toBe('blocked')
  })
})
