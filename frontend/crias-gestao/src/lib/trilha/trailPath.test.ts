import { describe, expect, it } from 'vitest'
import {
  buildTrailPathNodes,
  nowFocusCopy,
  sessionEffortHint,
  unitPositionLabel,
} from './trailPath'

describe('buildTrailPathNodes', () => {
  it('marca etapas anteriores como done e atual como current', () => {
    expect(buildTrailPathNodes(3, 5)).toEqual([
      { stageNumber: 1, state: 'done' },
      { stageNumber: 2, state: 'done' },
      { stageNumber: 3, state: 'current' },
      { stageNumber: 4, state: 'upcoming' },
      { stageNumber: 5, state: 'upcoming' },
    ])
  })

  it('sem total usa janela relativa ao cursor', () => {
    expect(buildTrailPathNodes(4, null)).toEqual([
      { stageNumber: 2, state: 'done' },
      { stageNumber: 3, state: 'done' },
      { stageNumber: 4, state: 'current' },
      { stageNumber: 5, state: 'upcoming' },
    ])
  })

  it('paused marca o nó atual como paused', () => {
    expect(buildTrailPathNodes(2, 3, { paused: true })[1]).toEqual({
      stageNumber: 2,
      state: 'paused',
    })
  })

  it('compact limita a 5 nós', () => {
    const nodes = buildTrailPathNodes(5, 10, { compact: true })
    expect(nodes).toHaveLength(5)
    expect(nodes.some((n) => n.state === 'current')).toBe(true)
  })
})

describe('nowFocusCopy', () => {
  it('CTA honesto: exercício vs leitura vs pausa', () => {
    expect(nowFocusCopy('await_answer', 2, 1).cta).toMatch(/Responder/)
    expect(nowFocusCopy('deliver_content', 1, 3).cta).toMatch(
      /Continuar de onde parou/,
    )
    expect(nowFocusCopy('await_release', 2, 1).cta).toBeNull()
    expect(nowFocusCopy('completed', 2, 1).cta).toBeNull()
  })
})

describe('sessionEffortHint', () => {
  it('framing de sessão curta', () => {
    expect(sessionEffortHint('deliver_content', 'fixed')).toMatch(/leitura/)
    expect(sessionEffortHint('await_answer', 'exercise')).toMatch(/exercício/)
    expect(sessionEffortHint('await_release', 'fixed')).toBeNull()
  })
})

describe('unitPositionLabel', () => {
  it('formata N de M nesta etapa', () => {
    expect(unitPositionLabel(2, 5)).toBe('2 de 5 nesta etapa')
    expect(unitPositionLabel(1, null)).toBeNull()
  })
})
