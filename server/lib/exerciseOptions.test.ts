import { describe, expect, it } from 'vitest'

import {
  answersMatch,
  coerceStructuredOptions,
  normalizeAnswerForCompare,
  parseLetteredChoicesFromContent,
  resolveExerciseOptions,
} from './exerciseOptions'

const SAMPLE = `*Qual das opções representa um exemplo de circunferência, mas não de círculo?*

A) A borda metálica de um aro de bicicleta.
B) A superfície de uma moeda.
C) A face de um relógio de parede.`

describe('parseLetteredChoicesFromContent', () => {
  it('extrai A/B/C do content', () => {
    const opts = parseLetteredChoicesFromContent(SAMPLE)
    expect(opts).toEqual([
      {
        key: 'A',
        text: 'A) A borda metálica de um aro de bicicleta.',
      },
      { key: 'B', text: 'B) A superfície de uma moeda.' },
      { key: 'C', text: 'C) A face de um relógio de parede.' },
    ])
  })

  it('aceita B. e C:', () => {
    const opts = parseLetteredChoicesFromContent(
      'Pergunta?\n\nA. um\nB. dois\nC: três',
    )
    expect(opts?.map((o) => o.key)).toEqual(['A', 'B', 'C'])
  })

  it('retorna null sem sequência válida', () => {
    expect(parseLetteredChoicesFromContent('Só texto sem opções')).toBeNull()
    expect(parseLetteredChoicesFromContent('A) só uma')).toBeNull()
    expect(
      parseLetteredChoicesFromContent('B) começa em B\nC) e C'),
    ).toBeNull()
  })
})

describe('resolveExerciseOptions', () => {
  it('usa structured quando existe', () => {
    expect(
      resolveExerciseOptions(
        [{ key: 'A', text: 'foo' }, { key: 'B', text: 'bar' }],
        SAMPLE,
      ),
    ).toEqual([
      { key: 'A', text: 'foo' },
      { key: 'B', text: 'bar' },
    ])
  })

  it('fallback para content quando options null', () => {
    const opts = resolveExerciseOptions(null, SAMPLE)
    expect(opts).toHaveLength(3)
    expect(opts?.[0].key).toBe('A')
  })

  it('coerce strings', () => {
    expect(coerceStructuredOptions(['A) x', 'B) y'])).toEqual([
      { key: 'A', text: 'A) x' },
      { key: 'B', text: 'B) y' },
    ])
  })
})

describe('normalizeAnswerForCompare / answersMatch', () => {
  it('mapeia letras para índice 1-based (gabarito numérico)', () => {
    expect(normalizeAnswerForCompare('A')).toBe('1')
    expect(normalizeAnswerForCompare('B)')).toBe('2')
    expect(normalizeAnswerForCompare('C) texto')).toBe('3')
    expect(normalizeAnswerForCompare('2')).toBe('2')
  })

  it('casa letra com gabarito numérico', () => {
    expect(answersMatch('B', '2')).toBe(true)
    expect(answersMatch('A', '2')).toBe(false)
    expect(answersMatch('3', 'C')).toBe(true)
  })
})
