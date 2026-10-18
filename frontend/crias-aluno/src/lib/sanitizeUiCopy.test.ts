import { describe, expect, it } from 'vitest'
import { sanitizeUiCopy } from './sanitizeUiCopy'

describe('sanitizeUiCopy', () => {
  it('troca travessão e en-dash por hífen', () => {
    expect(sanitizeUiCopy('Etapa 5 — Questão 5')).toBe('Etapa 5 - Questão 5')
    expect(sanitizeUiCopy('Etapa 1 – Modelo')).toBe('Etapa 1 - Modelo')
  })

  it('troca parceiro de estudo por monitor', () => {
    expect(
      sanitizeUiCopy('fale com o parceiro de estudo. Quando quiser seguir'),
    ).toBe('fale com o monitor. Quando quiser seguir')
    expect(sanitizeUiCopy('parceiro de estudos')).toBe('monitor')
  })

  it('remove emoji de balão', () => {
    expect(sanitizeUiCopy('💬 Se surgir alguma dúvida')).toBe(
      'Se surgir alguma dúvida',
    )
  })
})
