import { describe, expect, it } from 'vitest'

import {
  normalizeOptions,
  parseMcqFromContent,
  resolveExerciseOptions,
  stripMcqFromContent,
} from './exerciseOptions'

describe('normalizeOptions', () => {
  it('mapeia { key, text } e submete pela key', () => {
    const opts = normalizeOptions([
      { key: 'A', text: 'Lado' },
      { key: 'B', text: 'Diagonal' },
    ])
    expect(opts).toEqual([
      { key: 'A', label: 'A) Lado' },
      { key: 'B', label: 'B) Diagonal' },
    ])
  })

  it('exige pelo menos 2 opções', () => {
    expect(normalizeOptions([{ key: 'A', text: 'Só uma' }])).toBeNull()
  })
})

describe('parseMcqFromContent', () => {
  it('parseia alternativas inline A) B) C)', () => {
    const opts = parseMcqFromContent(
      'O que é? A) Lado B) Diagonal C) Ângulo',
    )
    expect(opts?.map((o) => o.key)).toEqual(['A', 'B', 'C'])
    expect(opts?.[0]?.label).toMatch(/Lado/)
  })

  it('parseia alternativas em linhas', () => {
    const opts = parseMcqFromContent('A) Lado\nB) Diagonal\nC) Ângulo')
    expect(opts).toHaveLength(3)
    expect(opts?.[1]?.key).toBe('B')
  })
})

describe('resolveExerciseOptions', () => {
  it('prioriza options estruturado', () => {
    const r = resolveExerciseOptions('A) X B) Y', [
      { key: 'A', text: 'Alpha' },
      { key: 'B', text: 'Beta' },
    ])
    expect(r.options?.[0]?.key).toBe('A')
    expect(r.displayBody).toContain('A) X')
  })

  it('faz fallback para texto e remove bloco do enunciado', () => {
    const r = resolveExerciseOptions(
      'Escolha:\nA) Lado\nB) Diagonal',
      null,
    )
    expect(r.options?.map((o) => o.key)).toEqual(['A', 'B'])
    expect(r.displayBody).toMatch(/Escolha/)
    expect(r.displayBody).not.toMatch(/Diagonal/)
  })

  it('textarea (null) quando não é MCQ', () => {
    const r = resolveExerciseOptions('Explique com suas palavras.', null)
    expect(r.options).toBeNull()
  })
})

describe('stripMcqFromContent', () => {
  it('remove linhas de alternativa', () => {
    const opts = parseMcqFromContent('A) um\nB) dois')!
    const body = stripMcqFromContent('Pergunta?\nA) um\nB) dois', opts)
    expect(body).toMatch(/Pergunta/)
    expect(body).not.toMatch(/dois/)
  })
})
