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

  it('parceiro_estudo apresenta-se como Monitor (não Maria)', () => {
    const body = getFallbackPromptBody('parceiro_estudo')
    expect(body).toMatch(/Apresente-se como "Monitor do Crias"/)
    expect(body).toMatch(/Nunca diga que se chama Maria/)
    expect(body).not.toMatch(/parceiro de estudo/i)
    expect(body).not.toMatch(/Você é Maria/)
    expect(body).not.toMatch(/WhatsApp/)
  })

  it('gerador_trilha não lista outros tutores como agentes ativos', () => {
    const body = getFallbackPromptBody('gerador_trilha')
    expect(body).toMatch(/Monitor/)
    expect(body).not.toMatch(/parceiro de estudo/i)
    expect(body).not.toMatch(/1\.2\. Tutores do Crias/)
    expect(body).not.toMatch(/Manda pro Júlio/)
    expect(body).not.toMatch(/WhatsApp/)
  })

  it('criar_trilha_ia sem NotebookLM/WhatsApp', () => {
    const body = getFallbackPromptBody('criar_trilha_ia')
    expect(body).not.toMatch(/NotebookLM/)
    expect(body).not.toMatch(/WhatsApp/)
  })

  it('isAiPromptId valida e spacing_rules saiu do catálogo', () => {
    expect(isAiPromptId('parceiro_estudo')).toBe(true)
    expect(isAiPromptId('spacing_rules')).toBe(false)
    expect(isAiPromptId('nope')).toBe(false)
    expect(AI_PROMPT_IDS).not.toContain('spacing_rules')
  })

  it('gerador e parceiro usam linhas vazias e FORMATO DO APP', () => {
    for (const id of ['gerador_trilha', 'parceiro_estudo'] as const) {
      const body = getFallbackPromptBody(id)
      expect(body).toMatch(/FORMATO DO APP/i)
      expect(body).not.toMatch(/FORMATO WHATSAPP/i)
      expect(body).not.toMatch(/utilizando exatamente o marcador \|\|\|/)
      expect(body).toMatch(/Não use o marcador legado \|\|\|/)
      expect(body).toMatch(/ênfase forte/i)
      expect(body).toMatch(/dois asteriscos/i)
      expect(body).not.toMatch(/negrito com um asterisco de cada lado/)
    }
  })
})
