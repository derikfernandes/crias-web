import { describe, expect, it } from 'vitest'

import { homeCanContinue, homeStatusLabel } from './homeCta'

describe('homeCanContinue (UX P0)', () => {
  it('permite Continuar só em deliver_content / await_answer', () => {
    expect(homeCanContinue('deliver_content')).toBe(true)
    expect(homeCanContinue('await_answer')).toBe(true)
    expect(homeCanContinue('await_release')).toBe(false)
    expect(homeCanContinue('blocked')).toBe(false)
    expect(homeCanContinue('completed')).toBe(false)
    expect(homeCanContinue(null)).toBe(false)
  })
})

describe('homeStatusLabel', () => {
  it('prioriza next_action await_release', () => {
    expect(homeStatusLabel('in_progress', 'await_release')).toBe(
      'Aguardando liberação',
    )
  })

  it('usa progresso quando next é deliver', () => {
    expect(homeStatusLabel('in_progress', 'deliver_content')).toBe(
      'Em andamento',
    )
    expect(homeStatusLabel('completed', 'completed')).toBe('Concluída')
  })
})
