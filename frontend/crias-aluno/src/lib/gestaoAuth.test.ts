import { describe, expect, it } from 'vitest'
import {
  looksLikeEmail,
  resolveUnifiedDestination,
} from './gestaoAuth'

describe('gestaoAuth unified destination', () => {
  it('só aluno → área do aluno', () => {
    expect(resolveUnifiedDestination({ student: true, gestao: false })).toEqual({
      kind: 'aluno',
      path: '/',
    })
  })

  it('só gestor → Gestão', () => {
    expect(resolveUnifiedDestination({ student: false, gestao: true })).toEqual({
      kind: 'gestao',
    })
  })

  it('ambos → aluno (switch)', () => {
    expect(resolveUnifiedDestination({ student: true, gestao: true })).toEqual({
      kind: 'aluno',
      path: '/',
    })
  })

  it('preserva deep-link do aluno', () => {
    expect(
      resolveUnifiedDestination({ student: true, gestao: false }, '/painel'),
    ).toEqual({ kind: 'aluno', path: '/painel' })
  })

  it('nenhum → none', () => {
    expect(resolveUnifiedDestination({ student: false, gestao: false })).toEqual({
      kind: 'none',
    })
  })

  it('looksLikeEmail', () => {
    expect(looksLikeEmail('a@b.co')).toBe(true)
    expect(looksLikeEmail('11999999999')).toBe(false)
    expect(looksLikeEmail('s1766')).toBe(false)
  })
})
