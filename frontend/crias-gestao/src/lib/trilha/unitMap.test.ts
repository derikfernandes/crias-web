import { describe, expect, it } from 'vitest'
import { buildUnitSections, stepTypeLabel } from './unitMap'

describe('buildUnitSections', () => {
  it('agrupa feito / atual / em breve e não spoilera tipos futuros', () => {
    const sections = buildUnitSections({
      currentStage: 2,
      currentQuestion: 2,
      totalStages: 3,
      totalQuestions: 3,
      currentStageType: 'exercise',
      history: [
        {
          stageNumber: 1,
          questionNumber: 1,
          stageType: 'fixed',
          title: 'Intro',
        },
        {
          stageNumber: 2,
          questionNumber: 1,
          stageType: 'fixed',
          title: 'Leitura',
        },
      ],
    })

    expect(sections).toHaveLength(3)
    expect(sections[0].status).toBe('done')
    expect(sections[0].collapsed).toBe(true)
    expect(sections[1].status).toBe('current')
    expect(sections[1].collapsed).toBe(false)
    expect(sections[1].steps[1].state).toBe('current')
    expect(sections[1].steps[1].stepType).toBe('exercise')
    expect(sections[1].steps[2].state).toBe('upcoming')
    expect(sections[1].steps[2].stepType).toBeNull()
    expect(sections[2].status).toBe('ahead')
    expect(sections[2].steps).toHaveLength(0)
  })

  it('etapa feita inclui aula do cursor quando s < stage', () => {
    const sections = buildUnitSections({
      currentStage: 2,
      currentQuestion: 2,
      totalStages: 3,
      totalQuestions: 3,
      currentStageType: 'fixed',
      history: [
        {
          stageNumber: 1,
          questionNumber: 1,
          stageType: 'fixed',
          title: 'Intro',
        },
      ],
    })
    expect(sections[0].steps.map((s) => s.questionNumber)).toContain(2)
  })

  it('paused marca o passo atual', () => {
    const sections = buildUnitSections({
      currentStage: 1,
      currentQuestion: 1,
      totalStages: 2,
      totalQuestions: 2,
      currentStageType: 'fixed',
      paused: true,
      history: [],
    })
    expect(sections[0].steps[0].state).toBe('paused')
  })
})

describe('stepTypeLabel', () => {
  it('rótulos sem spoiler', () => {
    expect(stepTypeLabel('fixed')).toBe('leitura')
    expect(stepTypeLabel(null)).toBeNull()
  })
})
