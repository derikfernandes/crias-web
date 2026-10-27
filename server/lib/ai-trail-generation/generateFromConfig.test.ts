import { describe, expect, it, vi } from 'vitest'

import {
  buildGenerationMessage,
  generateActivitiesFromConfig,
  PROMPT_VARIABLES,
  resolveVariables,
  substituteVariables,
  validateActivities,
  type StepKind,
} from './generateFromConfig.js'

const STRUCTURE: StepKind[] = ['content', 'content', 'exercise']

function activity(title: string, options = 4, correct = 'B') {
  return {
    title,
    steps: [
      { kind: 'content', title: 'Introdução', content: 'Texto 1', options: [], correct: '' },
      { kind: 'content', title: 'Exemplo', content: 'Texto 2', options: [], correct: '' },
      {
        kind: 'exercise',
        title: '',
        content: 'Qual é a resposta?',
        options: Array.from({ length: options }, (_, i) => `Alternativa ${i + 1}`),
        correct,
      },
    ],
  }
}

const GIVEN = {
  nome: 'Matemática básica',
  materia: 'Matemática',
  descricao: '',
  objetivo: 'Reforço',
  conteudos: '2',
  exercicios: '1',
  ordem: 'conteúdo, conteúdo, exercício',
  atividades: '2',
  alternativas: '4',
  habilidades: 'Porcentagem',
  orientacoes: '',
}

describe('variáveis do prompt', () => {
  it('manda campo vazio como N/A e usa o texto dos arquivos', () => {
    const v = resolveVariables(GIVEN, '')
    expect(v.descricao).toBe('N/A')
    expect(v.orientacoes).toBe('N/A')
    expect(v.arquivos).toBe('N/A')
    expect(resolveVariables(GIVEN, 'Arquivo: aula.txt').arquivos).toBe('Arquivo: aula.txt')
  })

  it('troca as 12 variáveis no texto do prompt, sem diferenciar maiúsculas', () => {
    const v = resolveVariables(GIVEN, 'fonte')
    const prompt = PROMPT_VARIABLES.map((k) => `[${k}]`).join(' ') + ' [NOME]'
    const out = substituteVariables(prompt, v)
    expect(out).not.toMatch(/\[[a-z]+\]/i)
    expect(out).toContain('Matemática básica')
    expect(out.endsWith('Matemática básica')).toBe(true)
  })
})

describe('mensagem enviada ao modelo', () => {
  const values = resolveVariables(GIVEN, '')

  it('leva todas as respostas do usuário mesmo que o prompt não cite as variáveis', () => {
    const text = buildGenerationMessage({
      prompt: 'Prompt fixo sem variáveis.',
      values,
      structure: STRUCTURE,
      mode: 'new',
      existingTitles: [],
      sources: '',
    })
    for (const key of PROMPT_VARIABLES) {
      expect(text).toContain(`[${key}]: ${values[key]}`)
    }
    expect(text).toContain('Prompt fixo sem variáveis.')
    expect(text).toContain('1. Conteúdo')
    expect(text).toContain('3. Exercício')
    expect(text).toContain('exatamente 2 atividades')
  })

  it('inclui as fontes só quando há arquivos', () => {
    const base = { prompt: 'P', values, structure: STRUCTURE, mode: 'new' as const, existingTitles: [] }
    expect(buildGenerationMessage({ ...base, sources: '' })).not.toContain('FONTES')
    expect(buildGenerationMessage({ ...base, sources: 'texto da aula' })).toContain('texto da aula')
  })

  it('em "append" lista as atividades que já existem', () => {
    const text = buildGenerationMessage({
      prompt: 'P',
      values,
      structure: STRUCTURE,
      mode: 'append',
      existingTitles: ['Frações', 'Porcentagem'],
      sources: '',
    })
    expect(text).toContain('Frações | Porcentagem')
    expect(text).toContain('SOMENTE as atividades novas')
  })
})

describe('validação do resultado', () => {
  const expected = { count: 2, structure: STRUCTURE, options: 4 }

  it('aceita o que cumpre o pedido', () => {
    const r = validateActivities([activity('A'), activity('B')], expected)
    expect(r.ok).toBe(true)
    expect(r.activities[0].steps[2].correct).toBe('B')
  })

  it('recusa quantidade errada, etapa fora de ordem, alternativas a menos e gabarito inválido', () => {
    expect(validateActivities([activity('A')], expected).issues.map((i) => i.code)).toContain('count')
    const wrongKind = activity('A')
    wrongKind.steps[0].kind = 'exercise'
    expect(validateActivities([wrongKind, activity('B')], expected).issues.map((i) => i.code)).toContain('kind')
    expect(validateActivities([activity('A', 3), activity('B')], expected).issues.map((i) => i.code)).toContain('options')
    expect(validateActivities([activity('A', 4, 'F'), activity('B')], expected).issues.map((i) => i.code)).toContain('correct')
  })

  it('recusa texto vazio e placeholder', () => {
    const bad = activity('A')
    bad.steps[0].content = '[inserir conteúdo]'
    expect(validateActivities([bad, activity('B')], expected).issues.map((i) => i.code)).toContain('empty')
  })
})

describe('generateActivitiesFromConfig', () => {
  const ok = JSON.stringify({ activities: [activity('A'), activity('B')] })
  const input = { mode: 'new' as const, variables: GIVEN, structure: STRUCTURE, files: [] }

  it('envia o prompt fixo e as respostas, e devolve as atividades validadas', async () => {
    const impl = vi.fn().mockResolvedValue({ text: ok, model: 'm' })
    const r = await generateActivitiesFromConfig(input, {} as NodeJS.ProcessEnv, impl)
    expect(r.ok).toBe(true)
    expect(r.activities).toHaveLength(2)
    const sent = impl.mock.calls[0][0].userText as string
    expect(sent).toContain('[habilidades]: Porcentagem')
    expect(sent).toContain('[descricao]: N/A')
    expect(sent).toContain('Matemática básica')
    expect(impl.mock.calls[0][0].timeoutMs).toBe(125_000)
  })

  it('passa timeoutMs longo (TRAIL_GENERATE_TIMEOUT_MS) e traduz erro de timeout', async () => {
    const impl = vi.fn().mockRejectedValue(
      new Error('generateContent timeout após 25000ms (modelo=gemini-3.7-flash).'),
    )
    const r = await generateActivitiesFromConfig(
      input,
      { TRAIL_GENERATE_TIMEOUT_MS: '130000' } as NodeJS.ProcessEnv,
      impl,
    )
    expect(r.ok).toBe(false)
    expect(impl.mock.calls[0][0].timeoutMs).toBe(130_000)
    expect(r.error).toBe('A geração demorou demais. Tente de novo em instantes.')
    expect(r.error).not.toMatch(/generateContent|gemini-/i)
  })

  it('tenta um reparo quando a primeira resposta não cumpre o pedido', async () => {
    const impl = vi
      .fn()
      .mockResolvedValueOnce({ text: JSON.stringify({ activities: [activity('A')] }), model: 'm' })
      .mockResolvedValueOnce({ text: ok, model: 'm' })
    const r = await generateActivitiesFromConfig(input, {} as NodeJS.ProcessEnv, impl)
    expect(r.ok).toBe(true)
    expect(r.repaired).toBe(true)
    expect(impl).toHaveBeenCalledTimes(2)
  })

  it('falha com mensagem clara se o reparo também não cumpre', async () => {
    const bad = JSON.stringify({ activities: [activity('A')] })
    const impl = vi.fn().mockResolvedValue({ text: bad, model: 'm' })
    const r = await generateActivitiesFromConfig(input, {} as NodeJS.ProcessEnv, impl)
    expect(r.ok).toBe(false)
    expect(r.activities).toEqual([])
    expect(r.error).toMatch(/estrutura/)
  })

  it('não chama a IA sem habilidades, orientações ou arquivos', async () => {
    const impl = vi.fn()
    const r = await generateActivitiesFromConfig(
      { ...input, variables: { ...GIVEN, habilidades: '' } },
      {} as NodeJS.ProcessEnv,
      impl,
    )
    expect(r.ok).toBe(false)
    expect(impl).not.toHaveBeenCalled()
  })

  it('exige pelo menos um exercício na estrutura', async () => {
    const impl = vi.fn()
    const r = await generateActivitiesFromConfig(
      { ...input, structure: ['content', 'content'] },
      {} as NodeJS.ProcessEnv,
      impl,
    )
    expect(r.ok).toBe(false)
    expect(impl).not.toHaveBeenCalled()
  })
})
