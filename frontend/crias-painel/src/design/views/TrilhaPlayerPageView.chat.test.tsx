import { describe, expect, it } from 'vitest'
import { buildChatTimeline } from './TrilhaPlayerPageView'

describe('buildChatTimeline', () => {
  it('acrescenta bolha efémera quando o passo atual ainda não está nos logs', () => {
    const timeline = buildChatTimeline({
      messages: [
        {
          id: '1',
          sender: 'system',
          message_text: 'Olá',
          stage_number: 1,
          question_number: 1,
        },
      ],
      body: 'Novo passo',
      stageNumber: 2,
      questionNumber: 1,
      nextAction: 'deliver_content',
    })
    expect(timeline).toHaveLength(2)
    expect(timeline[1].ephemeral).toBe(true)
    expect(timeline[1].message_text).toBe('Novo passo')
  })

  it('não duplica se o log já tem o mesmo texto na célula', () => {
    const timeline = buildChatTimeline({
      messages: [
        {
          id: '1',
          sender: 'system',
          message_text: 'Mesmo texto',
          stage_number: 2,
          question_number: 1,
        },
      ],
      body: 'Mesmo texto',
      stageNumber: 2,
      questionNumber: 1,
      nextAction: 'deliver_content',
    })
    expect(timeline).toHaveLength(1)
    expect(timeline[0].ephemeral).toBeUndefined()
  })
})
