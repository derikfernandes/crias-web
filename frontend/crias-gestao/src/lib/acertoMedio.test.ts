import { describe, expect, it } from 'vitest'
import {
  accuracyAggregate,
  answersFromAnswerMap,
  answersFromAttempts,
  gabaritoFromQuestions,
  isNonGradableAnswer,
  mergeAcertoAggregates,
  mergeAnswerSources,
} from './acertoMedio'
import type { ExerciseAttempt } from '../types/exerciseAttempt'

describe('isNonGradableAnswer', () => {
  it('exclui Continuar, 0 e vazio', () => {
    expect(isNonGradableAnswer('Continuar')).toBe(true)
    expect(isNonGradableAnswer('"Continuar"')).toBe(true)
    expect(isNonGradableAnswer('0')).toBe(true)
    expect(isNonGradableAnswer('"0"')).toBe(true)
    expect(isNonGradableAnswer('')).toBe(true)
    expect(isNonGradableAnswer('1')).toBe(false)
    expect(isNonGradableAnswer('A')).toBe(false)
  })
})

describe('accuracyAggregate (casos audit Sol)', () => {
  const gabarito = new Map([
    ['t47|7|1', '1'],
    ['t47|7|2', '2'],
    ['t47|9|1', '3'],
  ])
  const active = new Set(['s1', 's2'])

  it('Sol-like: logs densos ~68% e exclui Continuar/0', () => {
    // 68 certos + 32 errados = 68%; +10 Continuar/0 ignorados
    const answers = [
      ...Array.from({ length: 68 }, (_, i) => ({
        student_id: 's1',
        trail_id: 't47',
        stage_number: 7,
        question_number: 1,
        answer: '1',
      })),
      ...Array.from({ length: 32 }, () => ({
        student_id: 's1',
        trail_id: 't47',
        stage_number: 7,
        question_number: 2,
        answer: '1', // gabarito 2 → erro
      })),
      ...Array.from({ length: 10 }, () => ({
        student_id: 's1',
        trail_id: 't47',
        stage_number: 7,
        question_number: 1,
        answer: 'Continuar',
      })),
    ]
    // Deduplicate keys would collapse — use unique question slots via answerMap path
    const map = new Map<string, string>()
    for (let i = 0; i < 68; i++) map.set(`s1|t47|7|${100 + i}`, '1')
    // Only 3 gabarito keys — use many students instead
    const answers2 = [
      { student_id: 's1', trail_id: 't47', stage_number: 7, question_number: 1, answer: '1' },
      { student_id: 's1', trail_id: 't47', stage_number: 7, question_number: 2, answer: '1' },
      { student_id: 's2', trail_id: 't47', stage_number: 7, question_number: 1, answer: '1' },
      { student_id: 's2', trail_id: 't47', stage_number: 7, question_number: 2, answer: 'Continuar' },
      { student_id: 's2', trail_id: 't47', stage_number: 9, question_number: 1, answer: '0' },
    ]
    const r = accuracyAggregate({
      activeStudentIds: active,
      answers: answers2,
      gabarito,
    })
    // s1: 1 certo + 1 errado; s2: 1 certo; Continuar/0 ignorados → 2/3 = 66,7%
    expect(r.tried).toBe(3)
    expect(r.correct).toBe(2)
    expect(r.avgAccuracy).toBe(66.7)
  })

  it('attempts-only (subconjunto) pode dar 86% — não usar sozinho', () => {
    const attempts = [
      ...Array.from({ length: 117 }, () => ({
        student_id: 's1',
        trail_id: 't47',
        stage_number: 7,
        question_number: 1,
        student_answer: '1',
        is_correct: true,
      })),
      ...Array.from({ length: 19 }, () => ({
        student_id: 's1',
        trail_id: 't47',
        stage_number: 7,
        question_number: 2,
        student_answer: '1',
        is_correct: false,
      })),
    ] as ExerciseAttempt[]
    // Collapse to unique cells via merge with distinct q numbers
    const gab = new Map<string, string>()
    const answers = []
    for (let i = 0; i < 117; i++) {
      gab.set(`t47|7|${i + 1}`, '1')
      answers.push({
        student_id: 's1',
        trail_id: 't47',
        stage_number: 7,
        question_number: i + 1,
        answer: '1',
      })
    }
    for (let i = 0; i < 19; i++) {
      gab.set(`t47|9|${i + 1}`, '2')
      answers.push({
        student_id: 's1',
        trail_id: 't47',
        stage_number: 9,
        question_number: i + 1,
        answer: '1',
      })
    }
    const r = accuracyAggregate({
      activeStudentIds: new Set(['s1']),
      answers,
      gabarito: gab,
    })
    expect(r.tried).toBe(136)
    expect(r.correct).toBe(117)
    expect(r.avgAccuracy).toBe(86)
  })

  it('multi-instituição é ponderado por tentativas (nunca média das %)', () => {
    // Sol 117/136 = 86%; Teste 61/214 = 28,5%; junto 178/350 = 50,9%
    const sol = { correct: 117, tried: 136 }
    const teste = { correct: 61, tried: 214 }
    const merged = mergeAcertoAggregates([sol, teste])
    expect(merged.avgAccuracy).toBe(50.9)
    // Média simples das % seria ~57 — proibido
    expect(merged.avgAccuracy).not.toBe(57.3)
  })

  it('Sol+Teste com logs densos Sol (~68%) quase não muda com 1 aluno Teste', () => {
    // 39215/57603 ≈ 68,1%; Teste 0/9 → ainda ~68,1%
    const merged = mergeAcertoAggregates([
      { correct: 39215, tried: 57603 },
      { correct: 0, tried: 9 },
    ])
    expect(merged.avgAccuracy).toBe(68.1)
  })

  it('mergeAnswerSources: logs sobrescrevem attempts na mesma célula', () => {
    const fromAtt = answersFromAttempts([
      {
        student_id: 's1',
        trail_id: 't47',
        stage_number: 7,
        question_number: 1,
        student_answer: '2',
        is_correct: false,
      } as ExerciseAttempt,
    ])
    const fromLogs = answersFromAnswerMap(
      new Map([['s1|t47|7|1', '1']]),
    )
    const merged = mergeAnswerSources(fromLogs, fromAtt)
    expect(merged).toHaveLength(1)
    expect(merged[0]?.answer).toBe('1')
  })

  it('gabaritoFromQuestions ignora anulados e sem opção', () => {
    const { gabarito, annulled } = gabaritoFromQuestions([
      {
        trail_id: 't1',
        stage_number: 1,
        question_number: 1,
        correct_option: 'A',
      },
      {
        trail_id: 't1',
        stage_number: 1,
        question_number: 2,
        correct_option: 'B',
        annulled: true,
      },
      {
        trail_id: 't1',
        stage_number: 1,
        question_number: 3,
        correct_option: null,
      },
    ])
    expect(gabarito.get('t1|1|1')).toBe('A')
    expect(gabarito.has('t1|1|2')).toBe(false)
    expect(annulled.has('t1|1|2')).toBe(true)
    expect(gabarito.has('t1|1|3')).toBe(false)
  })
})
