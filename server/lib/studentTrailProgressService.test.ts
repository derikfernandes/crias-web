import { describe, expect, it } from 'vitest'

import {
  computeNextPosition,
  evaluateContentAvailability,
  loginChannelsForStudent,
  studentAcceptsTypedLogin,
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

describe('login dual telefone/e-mail (aluno)', () => {
  const both = {
    phone_number: '5511999990001',
    email: 'ana@escola.org',
    login_identifier: 'email' as const,
  }
  const phoneOnly = { phone_number: '5511999990001', email: '' }
  const emailOnly = { phone_number: '', email: 'ana@escola.org' }

  it('lista canais: só telefone, só e-mail, ambos', () => {
    expect(loginChannelsForStudent(phoneOnly)).toEqual(['phone'])
    expect(loginChannelsForStudent(emailOnly)).toEqual(['email'])
    expect(loginChannelsForStudent(both)).toEqual(['phone', 'email'])
  })

  it('com os dois, telefone e e-mail autenticam mesmo com login_identifier=email', () => {
    expect(studentAcceptsTypedLogin(both, '5511999990001', 's1')).toBe(true)
    expect(studentAcceptsTypedLogin(both, 'ana@escola.org', 's1')).toBe(true)
    expect(studentAcceptsTypedLogin(both, 's1', 's1')).toBe(true)
  })

  it('só telefone: e-mail digitado não autentica; telefone sim', () => {
    expect(studentAcceptsTypedLogin(phoneOnly, '5511999990001', 's2')).toBe(true)
    expect(studentAcceptsTypedLogin(phoneOnly, 'ana@escola.org', 's2')).toBe(false)
  })

  it('só e-mail: telefone digitado não autentica; e-mail sim', () => {
    expect(studentAcceptsTypedLogin(emailOnly, 'ana@escola.org', 's3')).toBe(true)
    expect(studentAcceptsTypedLogin(emailOnly, '5511999990001', 's3')).toBe(false)
  })
})
