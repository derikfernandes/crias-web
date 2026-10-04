import { describe, expect, it } from 'vitest'

import {
  isAheadOfPosition,
  looksLikeLessonConclusion,
  pickCanonicalTrailAiLogs,
  preferCurrentQuestionWindow,
  sanitizeContradictoryFeedback,
  sanitizeHistoryLogs,
  type HistoryLogRow,
} from './getHistory'

function row(
  partial: Partial<HistoryLogRow> &
    Pick<
      HistoryLogRow,
      'id' | 'stage_number' | 'question_number' | 'message_text'
    >,
): HistoryLogRow {
  return {
    student_id: 's1745',
    trail_id: 't47',
    sender: 'system',
    institution_id: 'i2',
    message_type: 'instruction',
    metadata: { source: 'trail-ai' },
    created_at_brasilia: null,
    created_at_ms: partial.created_at_ms ?? 1000,
    ...partial,
  }
}

describe('isAheadOfPosition', () => {
  it('detecta stage futuro na mesma question', () => {
    expect(
      isAheadOfPosition(
        { stage_number: 10, question_number: 86 },
        { stage: 1, question: 86 },
      ),
    ).toBe(true)
  })

  it('aceita stage atual e anteriores', () => {
    expect(
      isAheadOfPosition(
        { stage_number: 1, question_number: 86 },
        { stage: 1, question: 86 },
      ),
    ).toBe(false)
    expect(
      isAheadOfPosition(
        { stage_number: 5, question_number: 85 },
        { stage: 1, question: 86 },
      ),
    ).toBe(false)
  })
})

describe('sanitizeContradictoryFeedback', () => {
  it('remove Parabéns pelo acerto de feedback incorreto', () => {
    const raw =
      'Resposta incorreta.\n\n✅ A resposta correta é a letra B. Parabéns pelo acerto!\n\nO diâmetro mede o dobro do raio.'
    const out = sanitizeContradictoryFeedback(raw)
    expect(out).toMatch(/Resposta incorreta/i)
    expect(out).not.toMatch(/Parabéns pelo acerto/i)
    expect(out).toMatch(/diâmetro/i)
  })
})

describe('pickCanonicalTrailAiLogs', () => {
  it('prefers cache canônico e dropa regência stale', () => {
    const logs = [
      row({
        id: 'old',
        stage_number: 10,
        question_number: 86,
        message_text: 'Regência verbal: verbo gostar pede de.',
        created_at_ms: 1,
      }),
      row({
        id: 'new',
        stage_number: 10,
        question_number: 86,
        message_text: 'O diâmetro mede o dobro do raio (10 cm).',
        created_at_ms: 2,
      }),
    ]
    const canonical = new Map([
      ['10-86', 'O diâmetro mede o dobro do raio (10 cm).'],
    ])
    const keep = pickCanonicalTrailAiLogs(logs, canonical)
    expect(keep.has('new')).toBe(true)
    expect(keep.has('old')).toBe(false)
  })
})

describe('preferCurrentQuestionWindow', () => {
  it('prioriza q corrente e no máximo a anterior (não puxa q81 cega)', () => {
    const logs: HistoryLogRow[] = []
    for (let i = 0; i < 20; i++) {
      logs.push(
        row({
          id: `q81-${i}`,
          stage_number: 1 + (i % 5),
          question_number: 81,
          message_text: 'Regência verbal',
          created_at_ms: i,
        }),
      )
    }
    for (let i = 0; i < 5; i++) {
      logs.push(
        row({
          id: `q85-${i}`,
          stage_number: 1,
          question_number: 85,
          message_text: 'Aula 85',
          created_at_ms: 100 + i,
        }),
      )
    }
    logs.push(
      row({
        id: 'q86-1',
        stage_number: 1,
        question_number: 86,
        message_text: 'Iniciando a aula… Matemática',
        created_at_ms: 200,
      }),
    )
    const slice = preferCurrentQuestionWindow(logs, 10, {
      stage: 1,
      question: 86,
    })
    expect(slice.some((r) => r.question_number === 86)).toBe(true)
    expect(slice.every((r) => r.question_number === 86 || r.question_number === 85)).toBe(
      true,
    )
    expect(slice.some((r) => r.question_number === 81)).toBe(false)
  })
})

describe('sanitizeHistoryLogs', () => {
  it('esconde conclusão ahead-of-position após reset 1/86', () => {
    const logs = [
      row({
        id: 's1',
        stage_number: 1,
        question_number: 86,
        message_text: '📖 Nova aula',
        created_at_ms: 1,
      }),
      row({
        id: 'final',
        stage_number: 12,
        question_number: 86,
        message_text: 'Parabéns por concluir a aula! Resposta Final.',
        created_at_ms: 99,
        metadata: { source: 'next-content' },
      }),
    ]
    const out = sanitizeHistoryLogs(logs, {
      position: { stage: 1, question: 86 },
    })
    expect(out.map((r) => r.id)).toEqual(['s1'])
    expect(looksLikeLessonConclusion(logs[1].message_text)).toBe(true)
  })

  it('sanitiza feedback contraditório no read path', () => {
    const logs = [
      row({
        id: 'fb',
        stage_number: 7,
        question_number: 86,
        message_text:
          'Resposta incorreta.\n\nParabéns pelo acerto! O diâmetro é 10 cm.',
        message_type: 'feedback',
        metadata: { source: 'exercise_feedback' },
        created_at_ms: 5,
      }),
    ]
    const out = sanitizeHistoryLogs(logs, {
      position: { stage: 10, question: 86 },
    })
    expect(out).toHaveLength(1)
    expect(out[0].message_text).not.toMatch(/Parabéns pelo acerto/i)
    expect(out[0].message_text).toMatch(/Resposta incorreta/i)
  })
})
