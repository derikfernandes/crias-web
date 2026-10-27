import { describe, expect, it } from 'vitest'
import {
  activitiesFromRows,
  cellFieldsFromStep,
  composeExerciseContent,
  correctToLetter,
  numberAfter,
  parseActivitySheet,
  templateHeaders,
} from './trailActivities'
import { defaultOrder, phasesFromConfig, DEFAULT_STRUCTURE, withCounts, effectiveOrder } from './trailConfig'
import type { TrailStageQuestion } from '../types/trailStageQuestion'

const phases = phasesFromConfig({ ...DEFAULT_STRUCTURE, depth: 'baixa' }) // 3 conteúdos + 1 exercício

describe('estrutura da trilha', () => {
  it('conteúdos primeiro e exercícios por último', () => {
    expect(defaultOrder(3, 1)).toEqual(['c', 'c', 'c', 'e'])
    expect(phases.map((p) => p.stage_type)).toEqual(['ai', 'ai', 'ai', 'exercise'])
  })
  it('conteúdo nasce por IA, com título e comando do bloco por tipo', () => {
    expect(phases.slice(0, 3).map((p) => p.title)).toEqual(['Introdução', 'Explicação', 'Conclusão'])
    expect(phases.slice(0, 3).every((p) => p.prompt.length > 0)).toBe(true)
    expect(phases[3].prompt).toBe('')
  })
  it('ao salvar, mantém tipo e comando já gravados na mesma posição', () => {
    const saved = phases.map((p, i) => (i === 1 ? { ...p, stage_type: 'fixed' as const, title: 'Meu texto', prompt: '' } : p))
    const again = phasesFromConfig({ ...DEFAULT_STRUCTURE, depth: 'baixa' }, saved)
    expect(again[1]).toMatchObject({ stage_type: 'fixed', title: 'Meu texto' })
    expect(again[0].prompt).toBe(phases[0].prompt)
  })
  it('mudar as quantidades vira Personalizado, e volta a profundidade pronta quando combina', () => {
    const custom = withCounts(DEFAULT_STRUCTURE, 6, 2)
    expect(custom.depth).toBe('custom')
    expect(effectiveOrder(withCounts({ ...custom, depth: 'media' }, 5, 2))).toHaveLength(7)
  })
})

describe('gabarito', () => {
  it('converte número, letra e texto em letra', () => {
    expect(correctToLetter('1')).toBe('A')
    expect(correctToLetter('(d)')).toBe('D')
    expect(correctToLetter(null)).toBe('')
  })
})

describe('exercício gravado no banco', () => {
  it('grava enunciado, alternativas em linhas, lista estruturada e gabarito', () => {
    const f = cellFieldsFromStep(
      { number: 2, title: 'Frações', released: false },
      { stage: 4, kind: 'e', title: '', content: 'Quanto é 1/2 + 1/4?', options: ['3/4', '1/6', '2/6'], correct: 'A' },
    )
    expect(f.content).toBe('Quanto é 1/2 + 1/4?\nA) 3/4\nB) 1/6\nC) 2/6')
    expect(f.correct_option).toBe('A')
    expect(f.options).toEqual([{ key: 'A', text: '3/4' }, { key: 'B', text: '1/6' }, { key: 'C', text: '2/6' }])
    expect(f.title).toBe('Atividade 2: Frações')
    expect(composeExerciseContent('x', ['a'])).toBe('x\nA) a')
  })

  it('lê as células do banco de volta em atividades', () => {
    const row = (stage: number, q: number, extra: Partial<TrailStageQuestion>): TrailStageQuestion =>
      ({ id: `${stage}-${q}`, trail_id: 't', stage_number: stage, question_number: q, title: `Atividade ${q}: Tema`, content: '', correct_option: null, options: null, explanation: null, annulled: false, annulled_at: null, annulled_reason: null, is_released: true, active: true, created_at: null, updated_at: null, ...extra }) as TrailStageQuestion
    const acts = activitiesFromRows(
      [row(1, 1, { content: 'a' }), row(2, 1, { content: 'b' }), row(3, 1, { content: 'c' }), row(4, 1, { content: 'Pergunta\nA) x\nB) y', correct_option: '2' })],
      phases,
      4,
    )
    expect(acts).toHaveLength(1)
    expect(acts[0].title).toBe('Tema')
    expect(acts[0].steps[3]).toMatchObject({ kind: 'e', content: 'Pergunta', options: ['x', 'y'], correct: 'B' })
  })
})

describe('planilha de atividades: sempre adiciona', () => {
  const headers = templateHeaders(phases)
  it('o modelo tem uma coluna de gabarito por exercício', () => {
    expect(headers).toEqual(['Atividade', 'Etapa 1', 'Etapa 2', 'Etapa 3', 'Etapa 4', 'Gabarito 4'])
  })

  const rows = [
    { Atividade: 'Frações', 'Etapa 1': 't1', 'Etapa 2': 't2', 'Etapa 3': 't3', 'Etapa 4': 'Pergunta\nA) a\nB) b\nC) c\nD) d', 'Gabarito 4': 'C' },
    { Atividade: 'Erro', 'Etapa 1': '', 'Etapa 2': 't2', 'Etapa 3': 't3', 'Etapa 4': 'P\nA) a\nB) b', 'Gabarito 4': 'Z' },
    { Atividade: '', 'Etapa 1': '', 'Etapa 2': '', 'Etapa 3': '', 'Etapa 4': '', 'Gabarito 4': '' },
  ]
  it('aceita linhas válidas e aponta o erro de cada linha ruim', () => {
    const r = parseActivitySheet(rows, phases, 4)
    expect(r.activities).toHaveLength(1)
    expect(r.activities[0].steps[3]).toMatchObject({ correct: 'C', options: ['a', 'b', 'c', 'd'] })
    expect(r.errors.map((e) => e.row)).toContain(3)
    expect(r.errors.some((e) => /alternativas/.test(e.message))).toBe(true)
  })
  it('as atividades novas recebem os próximos números, sem tocar nas existentes', () => {
    const r = parseActivitySheet(rows.slice(0, 1), phases, 4)
    const out = numberAfter([{ number: 1 }, { number: 5 }], r.activities)
    expect(out.map((a) => a.number)).toEqual([6])
  })
  it('ainda lê a planilha antiga (Fase N)', () => {
    const legacy = [{ Etapa: '1', 'Fase 1': 'a', 'Fase 2': 'b', 'Fase 3': 'c', 'Fase 4': 'Q\nA) a\nB) b\nC) c\nD) d' }]
    const r = parseActivitySheet(legacy, phases, 4)
    expect(r.activities).toHaveLength(1)
    expect(r.activities[0].steps[3].correct).toBe('')
  })
})
