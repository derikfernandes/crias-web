import { describe, expect, it, vi } from 'vitest'

import {
  buildTrailAiPrompt,
  formatContextFromLogs,
} from './buildTrailAiPrompt'
import { formatAiAnswer } from './formatAiAnswer'
import {
  buildVertexGenerateContentUrl,
  DEFAULT_VERTEX_LOCATION,
  DEFAULT_VERTEX_MODEL,
  generateContentWithGemini,
  normalizeVertexModelId,
  resolveTrailAiModel,
  resolveVertexTarget,
} from './geminiClient'

describe('formatAiAnswer', () => {
  it('converte ||| em parágrafo', () => {
    expect(formatAiAnswer('*Título*|||Primeiro.|||Segundo.')).toBe(
      '*Título*\n\nPrimeiro.\n\nSegundo.',
    )
  })
})

describe('buildTrailAiPrompt', () => {
  it('inclui NAME, SCHOOL_GRADE, STUDENT_LEVEL, PROMPT, CONTENT, CONTEXT', () => {
    const built = buildTrailAiPrompt({
      name: 'Ana Silva',
      school_grade: '8º ano',
      student_level: 2,
      prompt: 'Explica frações',
      content: 'Seed da questão',
      context: 'Sistema: Olá\nAluno: oi',
      trail_title: 'Matemática',
    })
    expect(built.systemInstruction).not.toMatch(
      /utilizando exatamente o marcador \|\|\|/,
    )
    expect(built.systemInstruction).not.toMatch(/ESPAÇAMENTO OBRIGATÓRIO/)
    expect(built.systemInstruction).toMatch(/Não use o marcador legado \|\|\|/)
    expect(built.systemInstruction).toContain('Matemática')
    expect(built.systemInstruction).toMatch(/linha vazia/i)
    expect(built.userText).toContain('NAME: Ana')
    expect(built.userText).toContain('SCHOOL_GRADE: 8º ano')
    expect(built.userText).toContain('STUDENT_LEVEL: 2')
    expect(built.userText).toContain('PROMPT: Explica frações')
    expect(built.userText).toContain('CONTENT: Seed da questão')
    expect(built.userText).toContain('Sistema: Olá')
  })

  it('formatContextFromLogs ordena e limita', () => {
    const text = formatContextFromLogs(
      [
        { sender: 'system', message_text: 'a', stage_number: 1, question_number: 1 },
        { sender: 'student', message_text: 'b', stage_number: 1, question_number: 1 },
      ],
      20,
    )
    expect(text).toContain('[S1 Q1] Sistema: a')
    expect(text).toContain('[S1 Q1] Aluno: b')
  })
})

describe('generateContentWithGemini', () => {
  it('envia maxOutputTokens 8000, AbortSignal e devolve texto', async () => {
    const fetchImpl = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const href = String(url)
      expect(href).toContain('generateContent')
      expect(href).toContain('key=test-key')
      expect(init?.signal).toBeDefined()
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        generationConfig?: { maxOutputTokens?: number }
      }
      expect(body.generationConfig?.maxOutputTokens).toBe(8000)
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: '*Oi*|||Parágrafo.' }] } }],
        }),
        { status: 200 },
      )
    }) as unknown as typeof fetch

    const result = await generateContentWithGemini(
      { systemInstruction: 'sys', userText: 'user' },
      { GEMINI_API_KEY: 'test-key' } as NodeJS.ProcessEnv,
      fetchImpl,
    )
    expect(result.text).toContain('Oi')
  })

  it('propaga timeout do fetch como erro claro', async () => {
    const fetchImpl = vi.fn(async () => {
      const err = new Error('The operation was aborted due to timeout')
      err.name = 'TimeoutError'
      throw err
    }) as unknown as typeof fetch

    await expect(
      generateContentWithGemini(
        { systemInstruction: 'sys', userText: 'user' },
        {
          GEMINI_API_KEY: 'test-key',
          GEMINI_FETCH_TIMEOUT_MS: '5000',
        } as NodeJS.ProcessEnv,
        fetchImpl,
      ),
    ).rejects.toThrow(/generateContent timeout após 5000ms/)
  })

  it('monta URL Vertex global + gemini-3.7-flash', () => {
    expect(DEFAULT_VERTEX_LOCATION).toBe('global')
    expect(DEFAULT_VERTEX_MODEL).toBe('gemini-3.7-flash')
    expect(normalizeVertexModelId('gemini-3.7-flash')).toBe('gemini-3.7-flash')
    const target = resolveVertexTarget(
      {
        VERTEX_PROJECT_ID: 'crias-mvp',
        VERTEX_LOCATION: 'global',
      } as NodeJS.ProcessEnv,
      resolveTrailAiModel(
        { VERTEX_MODEL: 'gemini-3.7-flash' } as NodeJS.ProcessEnv,
        { useVertex: true },
      ),
    )
    expect(target?.projectId).toBe('crias-mvp')
    expect(target?.location).toBe('global')
    const url = buildVertexGenerateContentUrl(
      { projectId: 'crias-mvp', location: 'global' },
      'gemini-3.7-flash',
    )
    expect(url).toContain(
      'projects/crias-mvp/locations/global/publishers/google/models/gemini-3.7-flash:generateContent',
    )
  })
})
