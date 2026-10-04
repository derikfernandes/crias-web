import { describe, expect, it, vi } from 'vitest'

import {
  buildTrailAiPrompt,
  formatContextFromLogs,
} from '../buildTrailAiPrompt'
import { formatAiAnswer, TRAIL_AI_SPACING_RULES } from '../formatAiAnswer'
import {
  buildVertexGenerateContentUrl,
  DEFAULT_VERTEX_LOCATION,
  DEFAULT_VERTEX_MODEL,
  generateContentWithGemini,
  normalizeVertexModelId,
  resolveEffectiveVertexLocation,
  resolveTrailAiModel,
  resolveVertexTarget,
} from '../geminiClient'

describe('formatAiAnswer (Chatis script 37)', () => {
  it('converte ||| em parágrafo sem espaços adjacentes', () => {
    expect(formatAiAnswer('*Título*|||Primeiro.|||Segundo.')).toBe(
      '*Título*\n\nPrimeiro.\n\nSegundo.',
    )
  })

  it('tolera espaços à volta do marcador', () => {
    expect(formatAiAnswer('A ||| B')).toBe('A\n\nB')
  })

  it('trata null/undefined', () => {
    expect(formatAiAnswer(null)).toBe('')
    expect(formatAiAnswer(undefined)).toBe('')
  })
})

describe('buildTrailAiPrompt', () => {
  it('inclui NAME, STUDENT_LEVEL, PROMPT, CONTENT, CONTEXT e regras |||', () => {
    const built = buildTrailAiPrompt({
      name: 'Ana',
      student_level: 2,
      prompt: 'Explica frações',
      content: 'Seed da questão',
      context: 'Sistema: Olá\nAluno: oi',
      trail_title: 'Matemática',
    })
    expect(built.systemInstruction).toContain(TRAIL_AI_SPACING_RULES.slice(0, 40))
    expect(built.systemInstruction).toContain('Matemática')
    expect(built.userText).toContain('NAME: Ana')
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
  it('usa GEMINI_API_KEY e devolve texto das candidates', async () => {
    const fetchImpl = vi.fn(async (url: string | URL) => {
      const href = String(url)
      expect(href).toContain('generateContent')
      expect(href).toContain('key=test-key')
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: '*Oi*|||Parágrafo.' }] } }],
        }),
        { status: 200 },
      )
    }) as unknown as typeof fetch

    const result = await generateContentWithGemini(
      { systemInstruction: 'sys', userText: 'user' },
      {
        GEMINI_API_KEY: 'test-key',
        GEMINI_MODEL: 'gemini-2.0-flash',
      },
      fetchImpl,
    )
    expect(result.text).toContain('*Oi*')
    expect(result.model).toBe('gemini-2.0-flash')
  })

  it('falha sem credenciais', async () => {
    await expect(
      generateContentWithGemini(
        { systemInstruction: 's', userText: 'u' },
        {},
        vi.fn() as unknown as typeof fetch,
      ),
    ).rejects.toThrow(/GEMINI_API_KEY/)
  })

  it('com VERTEX_* + OAuth chama Vertex AI, não generativelanguage', async () => {
    const fetchImpl = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const href = String(url)
      if (href.includes('oauth2.googleapis.com/token')) {
        return new Response(JSON.stringify({ access_token: 'ya29.test' }), {
          status: 200,
        })
      }
      expect(href).toBe(
        'https://us-central1-aiplatform.googleapis.com/v1/projects/my-proj/locations/us-central1/publishers/google/models/gemini-2.0-flash-001:generateContent',
      )
      expect(href).not.toContain('generativelanguage')
      expect((init?.headers as Record<string, string>).Authorization).toBe(
        'Bearer ya29.test',
      )
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'Vertex ok|||Fim.' }] } }],
        }),
        { status: 200 },
      )
    }) as unknown as typeof fetch

    const result = await generateContentWithGemini(
      { systemInstruction: 'sys', userText: 'user' },
      {
        GOOGLE_OAUTH_CLIENT_ID: 'cid',
        GOOGLE_OAUTH_CLIENT_SECRET: 'sec',
        GOOGLE_OAUTH_REFRESH_TOKEN: 'rt',
        VERTEX_PROJECT_ID: 'my-proj',
        VERTEX_LOCATION: 'us-central1',
        VERTEX_MODEL: 'gemini-2.0-flash-001',
        VERTEX_PROXY_PORT: '8080',
      },
      fetchImpl,
    )
    expect(result.text).toContain('Vertex ok')
    expect(result.model).toBe('gemini-2.0-flash-001')
  })

  it('VERTEX_LOCATION=global + gemini-3.7-flash usa endpoint global exato', async () => {
    const expectedUrl =
      'https://aiplatform.googleapis.com/v1/projects/crias-mvp/locations/global/publishers/google/models/gemini-3.7-flash:generateContent'
    const fetchImpl = vi.fn(async (url: string | URL) => {
      const href = String(url)
      if (href.includes('oauth2.googleapis.com/token')) {
        return new Response(JSON.stringify({ access_token: 'ya29.test' }), {
          status: 200,
        })
      }
      expect(href).toBe(expectedUrl)
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'Global 3.7 ok' }] } }],
        }),
        { status: 200 },
      )
    }) as unknown as typeof fetch

    const result = await generateContentWithGemini(
      { systemInstruction: 'sys', userText: 'user' },
      {
        GOOGLE_OAUTH_CLIENT_ID: 'cid',
        GOOGLE_OAUTH_CLIENT_SECRET: 'sec',
        GOOGLE_OAUTH_REFRESH_TOKEN: 'rt',
        VERTEX_PROJECT_ID: 'crias-mvp',
        VERTEX_LOCATION: 'global',
        VERTEX_MODEL: 'gemini-3.7-flash',
      },
      fetchImpl,
    )
    expect(result.model).toBe('gemini-3.7-flash')
    expect(result.text).toBe('Global 3.7 ok')
  })

  it('404 publisher model orienta VERTEX_LOCATION e VERTEX_MODEL', async () => {
    const fetchImpl = vi.fn(async (url: string | URL) => {
      const href = String(url)
      if (href.includes('oauth2.googleapis.com/token')) {
        return new Response(JSON.stringify({ access_token: 'ya29.test' }), {
          status: 200,
        })
      }
      return new Response(
        JSON.stringify({
          error: {
            code: 404,
            message:
              'Publisher model `projects/p/locations/us-central1/publishers/google/models/x` was not found or your project does not have access to it.',
            status: 'NOT_FOUND',
          },
        }),
        { status: 404 },
      )
    }) as unknown as typeof fetch

    await expect(
      generateContentWithGemini(
        { systemInstruction: 's', userText: 'u' },
        {
          GOOGLE_OAUTH_CLIENT_ID: 'cid',
          GOOGLE_OAUTH_CLIENT_SECRET: 'sec',
          GOOGLE_OAUTH_REFRESH_TOKEN: 'rt',
          VERTEX_PROJECT_ID: 'p',
          VERTEX_LOCATION: 'us-central1',
          VERTEX_MODEL: 'modelo-inexistente',
        },
        fetchImpl,
      ),
    ).rejects.toThrow(
      new RegExp(
        `VERTEX_LOCATION=${DEFAULT_VERTEX_LOCATION}.*VERTEX_MODEL=${DEFAULT_VERTEX_MODEL}`,
      ),
    )
  })

  it('403 ACCESS_TOKEN_SCOPE_INSUFFICIENT orienta renovar OAuth ou GEMINI_API_KEY', async () => {
    const fetchImpl = vi.fn(async (url: string | URL) => {
      const href = String(url)
      if (href.includes('oauth2.googleapis.com/token')) {
        return new Response(JSON.stringify({ access_token: 'ya29.bad' }), {
          status: 200,
        })
      }
      return new Response(
        JSON.stringify({
          error: {
            code: 403,
            message: 'Request had insufficient authentication scopes.',
            status: 'PERMISSION_DENIED',
            details: [{ reason: 'ACCESS_TOKEN_SCOPE_INSUFFICIENT' }],
          },
        }),
        { status: 403 },
      )
    }) as unknown as typeof fetch

    await expect(
      generateContentWithGemini(
        { systemInstruction: 's', userText: 'u' },
        {
          GOOGLE_OAUTH_CLIENT_ID: 'cid',
          GOOGLE_OAUTH_CLIENT_SECRET: 'sec',
          GOOGLE_OAUTH_REFRESH_TOKEN: 'rt',
        },
        fetchImpl,
      ),
    ).rejects.toThrow(/cloud-platform|generative-language|GEMINI_API_KEY/)
  })
})

describe('resolveVertexTarget / buildVertexGenerateContentUrl', () => {
  it('exige project; location default global; PROXY_PORT sozinho não ativa', () => {
    expect(resolveVertexTarget({ VERTEX_PROXY_PORT: '8080' })).toBeNull()
    expect(resolveVertexTarget({ VERTEX_PROJECT_ID: 'p' })).toEqual({
      projectId: 'p',
      location: DEFAULT_VERTEX_LOCATION,
    })
    expect(DEFAULT_VERTEX_LOCATION).toBe('global')
    expect(
      resolveVertexTarget({
        VERTEX_PROJECT_ID: 'p',
        VERTEX_LOCATION: 'southamerica-east1',
      }),
    ).toEqual({
      projectId: 'p',
      location: 'southamerica-east1',
    })
  })

  it('global + Flash (incl. 3.7) NÃO remapeia — respeita env', () => {
    expect(
      resolveEffectiveVertexLocation('global', 'gemini-3.7-flash'),
    ).toEqual({
      location: 'global',
      remappedFromGlobal: false,
    })
    expect(
      resolveEffectiveVertexLocation('global', 'gemini-2.0-flash-001'),
    ).toEqual({
      location: 'global',
      remappedFromGlobal: false,
    })
    expect(
      resolveVertexTarget({
        VERTEX_PROJECT_ID: 'crias-mvp',
        VERTEX_LOCATION: 'global',
        VERTEX_MODEL: 'gemini-3.7-flash',
      }),
    ).toEqual({
      projectId: 'crias-mvp',
      location: 'global',
    })
  })

  it('normaliza alias AI Studio 2.0; deixa gemini-3.7-flash intacto', () => {
    expect(normalizeVertexModelId('gemini-2.0-flash')).toBe(
      'gemini-2.0-flash-001',
    )
    expect(normalizeVertexModelId('gemini-3.7-flash')).toBe('gemini-3.7-flash')
    expect(
      resolveTrailAiModel(
        { VERTEX_MODEL: 'gemini-3.7-flash' },
        { useVertex: true },
      ),
    ).toBe('gemini-3.7-flash')
    expect(resolveTrailAiModel({}, { useVertex: true })).toBe(
      DEFAULT_VERTEX_MODEL,
    )
    expect(DEFAULT_VERTEX_MODEL).toBe('gemini-3.7-flash')
  })

  it('monta host regional e o endpoint global exato do dérik', () => {
    expect(
      buildVertexGenerateContentUrl(
        { projectId: 'p', location: 'us-central1' },
        'm',
      ),
    ).toBe(
      'https://us-central1-aiplatform.googleapis.com/v1/projects/p/locations/us-central1/publishers/google/models/m:generateContent',
    )
    expect(
      buildVertexGenerateContentUrl(
        { projectId: 'crias-mvp', location: 'global' },
        'gemini-3.7-flash',
      ),
    ).toBe(
      'https://aiplatform.googleapis.com/v1/projects/crias-mvp/locations/global/publishers/google/models/gemini-3.7-flash:generateContent',
    )
  })
})
