import { describe, expect, it } from 'vitest'
import { auditSolDenom, summarizeDenomDelta } from './auditSolDenom'

const emptyBase = {
  institutionId: 'i2',
  trailIds: ['t47'],
  students: [{ id: 's1', name: 'Ana', active: true }],
  trails: [{ id: 't47', name: 'Sol', active: true }],
}

describe('auditSolDenom', () => {
  it('separa no_gabarito de graded e não mete vazio no denom', () => {
    const audit = auditSolDenom({
      ...emptyBase,
      studentsMap: {
        s1: {
          answers: {
            '0|1|1': 'A', // correct
            '0|1|2': 'Z', // wrong
            '0|1|3': 'B', // no gabarito
            '0|1|4': 'Continuar',
            '0|1|5': '0',
            '0|1|6': '',
          },
          extra_done: [],
        },
      },
      questions: [
        {
          trail_id: 't47',
          stage_number: 1,
          question_number: 1,
          correct_option: 'A',
        },
        {
          trail_id: 't47',
          stage_number: 1,
          question_number: 2,
          correct_option: 'A',
        },
        // 1|3 sem correct_option
        {
          trail_id: 't47',
          stage_number: 1,
          question_number: 3,
        },
      ],
    })
    expect(audit.correct_current).toBe(1)
    expect(audit.denom_current).toBe(2)
    expect(audit.no_gabarito).toBe(1)
    expect(audit.totals.non_gradable_continuar).toBe(1)
    expect(audit.totals.non_gradable_zero).toBe(1)
    expect(audit.totals.non_gradable_empty).toBe(1)
    expect(audit.denom_cells_empty_gabarito).toBe(0)
    const delta = summarizeDenomDelta(audit, 2, 1)
    expect(delta.delta_tried).toBe(0)
    expect(delta.delta_correct).toBe(0)
  })
})
