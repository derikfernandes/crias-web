import { describe, expect, it } from 'vitest'

import { getFallbackPromptBody } from './fallbacks'
import { AI_PROMPT_IDS, isAiPromptId } from './ids'

describe('ai-prompts registry', () => {
  it('todos os IDs têm fallback não vazio', () => {
    for (const id of AI_PROMPT_IDS) {
      const body = getFallbackPromptBody(id)
      expect(body.length).toBeGreaterThan(20)
    }
  })

  it('parceiro_estudo apresenta-se como parceiro (não Maria)', () => {
    const body = getFallbackPromptBody('parceiro_estudo')
    expect(body).toMatch(/parceiro de estudo/i)
    expect(body).not.toMatch(/Você é Maria/)
    expect(body).not.toMatch(/WhatsApp/)
  })

  it('gerador_trilha não lista outros tutores como agentes ativos', () => {
    const body = getFallbackPromptBody('gerador_trilha')
    expect(body).toMatch(/parceiro de estudo/i)
    expect(body).not.toMatch(/1\.2\. Tutores do Crias/)
    expect(body).not.toMatch(/Manda pro Júlio/)
    expect(body).not.toMatch(/WhatsApp/)
  })

  it('criar_trilha_ia sem NotebookLM/WhatsApp', () => {
    const body = getFallbackPromptBody('criar_trilha_ia')
    expect(body).not.toMatch(/NotebookLM/)
    expect(body).not.toMatch(/WhatsApp/)
  })

  it('isAiPromptId valida', () => {
    expect(isAiPromptId('parceiro_estudo')).toBe(true)
    expect(isAiPromptId('nope')).toBe(false)
  })
})
