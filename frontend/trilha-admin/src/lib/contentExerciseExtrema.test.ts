import { describe, expect, it } from 'vitest'
import {
  pickContentExerciseExtrema,
  type ContentExercisePick,
} from './contentExerciseExtrema'

function ex(
  partial: Partial<ContentExercisePick> & Pick<ContentExercisePick, 'exKey' | 'pct'>,
): ContentExercisePick {
  return {
    label: partial.label ?? `Ex ${partial.exKey}`,
    note: partial.note ?? `Conteúdo 86 · Ex. ${partial.exKey}`,
    contentKey: partial.contentKey ?? 'trail|86',
    ...partial,
  }
}

describe('pickContentExerciseExtrema', () => {
  it('retorna nulls com pool vazio', () => {
    expect(pickContentExerciseExtrema([])).toEqual({
      lowest: null,
      highest: null,
    })
  })

  it('com um único exercício, só preenche o menor', () => {
    const result = pickContentExerciseExtrema([ex({ exKey: 'a', pct: 42 })])
    expect(result.lowest?.exKey).toBe('a')
    expect(result.highest).toBeNull()
  })

  it('escolhe exercícios distintos com % diferentes', () => {
    const result = pickContentExerciseExtrema([
      ex({ exKey: 'a', pct: 20, label: 'Difícil' }),
      ex({ exKey: 'b', pct: 42, label: 'Média' }),
      ex({ exKey: 'c', pct: 90, label: 'Fácil' }),
    ])
    expect(result.lowest).toMatchObject({ exKey: 'a', pct: 20, label: 'Difícil' })
    expect(result.highest).toMatchObject({ exKey: 'c', pct: 90, label: 'Fácil' })
  })

  it('não duplica quando todos têm o mesmo %', () => {
    const result = pickContentExerciseExtrema([
      ex({ exKey: 'a', pct: 42 }),
      ex({ exKey: 'b', pct: 42 }),
      ex({ exKey: 'c', pct: 42 }),
    ])
    expect(result.lowest?.pct).toBe(42)
    expect(result.highest).toBeNull()
  })

  it('mesmo conteúdo, exercícios diferentes', () => {
    const result = pickContentExerciseExtrema([
      ex({
        exKey: '1',
        pct: 10,
        contentKey: 't|86',
        note: 'Conteúdo 86 · Ex. 1',
        label: 'Questão A',
      }),
      ex({
        exKey: '2',
        pct: 80,
        contentKey: 't|86',
        note: 'Conteúdo 86 · Ex. 2',
        label: 'Questão B',
      }),
    ])
    expect(result.lowest?.note).toBe('Conteúdo 86 · Ex. 1')
    expect(result.highest?.note).toBe('Conteúdo 86 · Ex. 2')
    expect(result.lowest?.contentKey).toBe(result.highest?.contentKey)
    expect(result.lowest?.exKey).not.toBe(result.highest?.exKey)
  })
})
