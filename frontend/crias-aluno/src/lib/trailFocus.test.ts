import { describe, expect, it, beforeEach } from 'vitest'
import {
  pickHomeTrail,
  readFocusedTrailId,
  writeFocusedTrailId,
} from './trailFocus'
import type { StudentTrailRow } from './api'

function row(
  trail_id: string,
  status: StudentTrailRow['status'],
  stage = 1,
): StudentTrailRow {
  return {
    id: `${trail_id}_row`,
    student_id: 's1766',
    institution_id: 'i4',
    trail_id,
    current_stage_number: stage,
    current_question_number: 1,
    status,
  }
}

const memory = new Map<string, string>()
beforeEach(() => {
  memory.clear()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => {
        memory.set(k, String(v))
      },
      removeItem: (k: string) => {
        memory.delete(k)
      },
      clear: () => memory.clear(),
    },
  })
})

describe('pickHomeTrail', () => {
  it('prioriza trilha em foco recente (t58) sobre a 1ª in_progress (t54)', () => {
    writeFocusedTrailId('t58')
    const picked = pickHomeTrail([
      row('t54', 'in_progress', 2),
      row('t58', 'in_progress', 4),
      row('t62', 'in_progress', 2),
    ])
    expect(picked?.trail_id).toBe('t58')
    expect(readFocusedTrailId()).toBe('t58')
  })

  it('aceita foco explícito sem localStorage', () => {
    const picked = pickHomeTrail(
      [row('t54', 'in_progress', 2), row('t58', 'in_progress', 4)],
      't58',
    )
    expect(picked?.trail_id).toBe('t58')
  })

  it('sem foco: primeira in_progress', () => {
    const picked = pickHomeTrail([
      row('t54', 'in_progress', 2),
      row('t58', 'in_progress', 4),
    ])
    expect(picked?.trail_id).toBe('t54')
  })

  it('foco em trilha bloqueada cai no fallback', () => {
    writeFocusedTrailId('t99')
    const picked = pickHomeTrail([
      row('t99', 'blocked'),
      row('t58', 'in_progress', 1),
    ])
    expect(picked?.trail_id).toBe('t58')
  })
})
