import { describe, expect, it } from 'vitest'

import {
  answersMatch,
  coerceStructuredOptions,
  normalizeAnswerForCompare,
  parseLetteredChoicesFromContent,
  parseNumberedChoicesFromContent,
  resolveExerciseOptions,
  stripLetteredChoicesFromContent,
} from './exerciseOptions'

const SAMPLE = `*Qual das opções representa um exemplo de circunferência, mas não de círculo?*

A) A borda metálica de um aro de bicicleta.
B) A superfície de uma moeda.
C) A face de um relógio de parede.`

/** Conteúdo real t62 stage 2 q3 (produção). */
const SAMPLE_NUMBERED = `Por que o Órgão Especial do TJSP declarou a inconstitucionalidade dos cargos de assessoramento previstos no Anexo II da Lei nº 11.082/2025?

1) Porque possuíam atribuições de apoio material, execução técnica ordinária e produção de subsídios, sem inserção no núcleo decisório político da Administração.
2) Porque os cargos eram privativos de servidores concursados e não permitiam a livre nomeação pelo Prefeito.
3) Porque a lei municipal não exigiu nível superior de ensino para os assessores.`

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

  it('aceita (A) (B) (C)', () => {
    const opts = parseLetteredChoicesFromContent(
      'Quanto vale?\n\n(A) 25,12\n(B) 25,21\n(C) 52,12',
    )
    expect(opts?.map((o) => o.key)).toEqual(['A', 'B', 'C'])
    expect(opts?.[0].text).toBe('A) 25,12')
  })

  it('retorna null sem sequência válida', () => {
    expect(parseLetteredChoicesFromContent('Só texto sem opções')).toBeNull()
    expect(parseLetteredChoicesFromContent('A) só uma')).toBeNull()
    expect(
      parseLetteredChoicesFromContent('B) começa em B\nC) e C'),
    ).toBeNull()
  })
})

describe('parseNumberedChoicesFromContent', () => {
  it('extrai 1/2/3 do content (formato t62)', () => {
    const opts = parseNumberedChoicesFromContent(SAMPLE_NUMBERED)
    expect(opts?.map((o) => o.key)).toEqual(['1', '2', '3'])
    expect(opts?.[0].text).toMatch(/^1\) Porque possuíam/)
    expect(opts?.[2].text).toMatch(/^3\) Porque a lei municipal/)
  })

  it('aceita 1. 2. e (1) (2)', () => {
    expect(
      parseNumberedChoicesFromContent('P?\n\n1. um\n2. dois\n3. três')?.map(
        (o) => o.key,
      ),
    ).toEqual(['1', '2', '3'])
    expect(
      parseNumberedChoicesFromContent('P?\n\n(1) um\n(2) dois')?.map(
        (o) => o.key,
      ),
    ).toEqual(['1', '2'])
  })

  it('retorna null sem sequência válida a partir de 1', () => {
    expect(parseNumberedChoicesFromContent('Só texto')).toBeNull()
    expect(parseNumberedChoicesFromContent('1) só uma')).toBeNull()
    expect(
      parseNumberedChoicesFromContent('2) começa em 2\n3) e 3'),
    ).toBeNull()
  })
})

describe('stripLetteredChoicesFromContent', () => {
  it('remove linhas (A)/(B) e mantém enunciado', () => {
    const out = stripLetteredChoicesFromContent(
      'Enunciado aqui.\n\n(A) 25,12\n(B) 25,21\n(C) 52,12\n',
    )
    expect(out).toBe('Enunciado aqui.')
  })

  it('remove linhas 1)/2)/3) e mantém enunciado', () => {
    const out = stripLetteredChoicesFromContent(SAMPLE_NUMBERED)
    expect(out).toBe(
      'Por que o Órgão Especial do TJSP declarou a inconstitucionalidade dos cargos de assessoramento previstos no Anexo II da Lei nº 11.082/2025?',
    )
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

  it('fallback numerado quando options null (t62)', () => {
    const opts = resolveExerciseOptions(null, SAMPLE_NUMBERED)
    expect(opts).toHaveLength(3)
    expect(opts?.map((o) => o.key)).toEqual(['1', '2', '3'])
  })

  it('prioriza lettered sobre numerado no mesmo content', () => {
    const mixed = 'P?\n\nA) um\nB) dois\n\n1) ignore\n2) ignore'
    expect(resolveExerciseOptions(null, mixed)?.map((o) => o.key)).toEqual([
      'A',
      'B',
    ])
  })

  it('coerce strings', () => {
    expect(coerceStructuredOptions(['A) x', 'B) y'])).toEqual([
      { key: 'A', text: 'A) x' },
      { key: 'B', text: 'B) y' },
    ])
    expect(coerceStructuredOptions(['1) x', '2) y'])).toEqual([
      { key: '1', text: '1) x' },
      { key: '2', text: '2) y' },
    ])
  })
})

describe('normalizeAnswerForCompare / answersMatch', () => {
  it('mapeia letras para índice 1-based (gabarito numérico)', () => {
    expect(normalizeAnswerForCompare('A')).toBe('1')
    expect(normalizeAnswerForCompare('B)')).toBe('2')
    expect(normalizeAnswerForCompare('(A)')).toBe('1')
    expect(normalizeAnswerForCompare('C) texto')).toBe('3')
    expect(normalizeAnswerForCompare('2')).toBe('2')
  })

  it('casa letra com gabarito numérico', () => {
    expect(answersMatch('B', '2')).toBe(true)
    expect(answersMatch('A', '2')).toBe(false)
    expect(answersMatch('3', 'C')).toBe(true)
  })
})
