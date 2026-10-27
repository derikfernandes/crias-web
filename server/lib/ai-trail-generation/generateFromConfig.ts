import type { Firestore } from 'firebase-admin/firestore'

import { getPromptBody } from '../ai-prompts/index.js'
import {
  generateContentWithGemini,
  type GeminiGenerateResult,
} from '../trail-ai/geminiClient.js'
import {
  canAffordTrailGenerateCall,
  friendlyTrailGenerateError,
  remainingTrailGenerateTimeoutMs,
  resolveTrailGenerateTimeoutMs,
} from './timeout.js'
import {
  extractDocuments,
  formatSourcesForPrompt,
  type UploadedDoc,
} from './extractText.js'

/**
 * Geração de atividades com a Configuração de geração (Gestão v1.1).
 *
 * Mensagem enviada ao modelo = prompt fixo do sistema ("Criar trilha com IA", Firestore
 * `ai_prompts`) + Configuração de geração (respostas do usuário) + fontes (arquivos).
 * As 12 variáveis do prompt são sempre enviadas; campo vazio vai como "N/A". Nada do que
 * o usuário preencheu fica de fora. Não grava no Firestore: o resultado vira prévia.
 */

export const PROMPT_VARIABLES = [
  'nome',
  'materia',
  'descricao',
  'objetivo',
  'conteudos',
  'exercicios',
  'ordem',
  'atividades',
  'alternativas',
  'habilidades',
  'orientacoes',
  'arquivos',
] as const

export type PromptVariable = (typeof PROMPT_VARIABLES)[number]
export type StepKind = 'content' | 'exercise'

export type ConfigGenerateInput = {
  /** "new": trilha nova. "append": mais atividades numa trilha existente. */
  mode: 'new' | 'append'
  /** Variáveis informadas pelo usuário (sem `arquivos`, que vem do texto dos arquivos). */
  variables: Partial<Record<PromptVariable, string>>
  /** Estrutura fixa de cada atividade, na ordem das etapas. */
  structure: StepKind[]
  /** Títulos das atividades que já existem (só em "append"). */
  existingTitles?: string[]
  files: UploadedDoc[]
  db?: Firestore | null
}

export type GeneratedStep = {
  kind: StepKind
  title: string
  content: string
  options: string[]
  correct: string
}

export type GeneratedActivity = { title: string; steps: GeneratedStep[] }

export type ConfigIssue = { code: string; message: string }

export type ConfigGenerateResult = {
  ok: boolean
  activities: GeneratedActivity[]
  issues: ConfigIssue[]
  model: string
  repaired: boolean
  truncatedSources: boolean
  /** Mensagem enviada ao modelo (para auditoria e teste). */
  userText?: string
  error?: string
}

/** Prompt de reserva: usado só se o documento `criar_trilha_ia` não existir no Firestore. */
export const FALLBACK_CRIAR_TRILHA_IA = `Você cria atividades educacionais para a plataforma Crias.

Crie as atividades da trilha "[nome]" (matéria: [materia]). Descrição: [descricao]. Objetivo da trilha: [objetivo].

Cada atividade tem sempre a mesma estrutura de etapas, nesta ordem: [ordem]. São [conteudos] etapas de conteúdo e [exercicios] exercícios. Cada exercício é de múltipla escolha, com [alternativas] alternativas e uma única correta. Crie [atividades] atividades.

Trabalhe estas habilidades e conteúdos: [habilidades].
Siga estas orientações: [orientacoes].
Use como fonte o material enviado: [arquivos].

Regras:
- Escreva em português do Brasil, com frases curtas e claras, sem travessão.
- Use só informações sustentadas pelas habilidades, orientações e arquivos. Não invente fatos.
- Cada etapa de conteúdo segue a sequência: contextualização, introdução, exemplos, desenvolvimento e conclusão, distribuída pelas etapas da atividade.
- Cada exercício traz um enunciado e as alternativas. Só uma é correta.
- Sem placeholders, sem texto vazio.`

/** Instrução de sistema da nova geração (formato de saída fixo). */
export const ACTIVITIES_SYSTEM = `Você gera atividades educacionais para a plataforma CRIAS.
Responda APENAS com JSON válido conforme o schema: {"activities":[{"title":"...","steps":[{"kind":"content"|"exercise","title":"...","content":"...","options":[],"correct":""}]}]}.
Regras do formato:
- A estrutura de etapas de TODAS as atividades é a informada na Configuração de geração (ordem e tipos). Não mude a ordem nem a quantidade.
- kind "content": "content" tem o texto da etapa; "options" é [] e "correct" é "".
- kind "exercise": "content" tem só o enunciado (sem as alternativas); "options" tem exatamente o número de alternativas pedido, só o texto de cada uma, sem a letra; "correct" é a letra da alternativa certa (A, B, C...).
- A quantidade de atividades é exatamente a pedida. Cada atividade tem um título curto.
- Português do Brasil, sem travessão, sem placeholders e sem campos vazios.
- Use somente as fontes e orientações informadas.`

export const ACTIVITIES_JSON_SCHEMA = {
  type: 'object',
  properties: {
    activities: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                kind: { type: 'string', enum: ['content', 'exercise'] },
                title: { type: 'string' },
                content: { type: 'string' },
                options: { type: 'array', items: { type: 'string' } },
                correct: { type: 'string' },
              },
              required: ['kind', 'title', 'content', 'options', 'correct'],
            },
          },
        },
        required: ['title', 'steps'],
      },
    },
  },
  required: ['activities'],
} as const

const NA = 'N/A'

function clean(value: unknown): string {
  const s = typeof value === 'string' ? value.trim() : ''
  return s ? s : NA
}

/** Valores finais das 12 variáveis. Vazio vira "N/A"; `arquivos` traz o texto dos arquivos. */
export function resolveVariables(
  given: Partial<Record<PromptVariable, string>>,
  filesText: string,
): Record<PromptVariable, string> {
  const out = {} as Record<PromptVariable, string>
  for (const key of PROMPT_VARIABLES) {
    out[key] = key === 'arquivos' ? clean(filesText) : clean(given[key])
  }
  return out
}

/** Troca cada [variavel] do prompt pelo valor informado (sem diferenciar maiúsculas). */
export function substituteVariables(
  prompt: string,
  values: Record<PromptVariable, string>,
): string {
  let out = prompt
  for (const key of PROMPT_VARIABLES) {
    out = out.replace(new RegExp(`\\[\\s*${key}\\s*\\]`, 'gi'), () => values[key])
  }
  return out
}

/** Bloco "CONFIGURAÇÃO DE GERAÇÃO": garante que todas as respostas do usuário vão no envio. */
export function configurationBlock(
  values: Record<PromptVariable, string>,
  structure: StepKind[],
  mode: 'new' | 'append',
  existingTitles: string[],
): string {
  const lines = PROMPT_VARIABLES.map((k) => `[${k}]: ${values[k]}`)
  const steps = structure
    .map((k, i) => `${i + 1}. ${k === 'exercise' ? 'Exercício' : 'Conteúdo'}`)
    .join('\n')
  const parts = [
    'CONFIGURAÇÃO DE GERAÇÃO (respostas do usuário):',
    ...lines,
    '',
    'Estrutura de etapas de cada atividade (fixa, nesta ordem):',
    steps,
  ]
  if (mode === 'append') {
    parts.push(
      '',
      'Esta é uma trilha que já existe: crie SOMENTE as atividades novas, sem repetir as que já existem.',
      `Atividades que já existem: ${existingTitles.length > 0 ? existingTitles.join(' | ') : NA}`,
    )
  }
  return parts.join('\n')
}

const LINE = '--------------------------------------------------------------------------------'

/** Monta a mensagem final: prompt fixo + configuração + fontes + pedido de saída. */
export function buildGenerationMessage(input: {
  prompt: string
  values: Record<PromptVariable, string>
  structure: StepKind[]
  mode: 'new' | 'append'
  existingTitles: string[]
  sources: string
}): string {
  const body = substituteVariables(input.prompt, input.values).trim()
  const parts = [
    body,
    LINE,
    configurationBlock(input.values, input.structure, input.mode, input.existingTitles),
  ]
  if (input.sources.trim()) {
    parts.push(
      LINE,
      'FONTES (arquivos enviados; use SOMENTE estas fontes, além das habilidades e orientações):',
      '',
      input.sources.trim(),
    )
  }
  parts.push(
    LINE,
    `ENTREGUE AGORA o JSON com exatamente ${input.values.atividades} atividades, cada uma com as etapas na ordem da estrutura. Sem placeholders.`,
  )
  return parts.join('\n\n')
}

const PLACEHOLDER = /\[\s*(inserir|criar|explicar|preencher|conte[uú]do)[^\]]*\]|\[\s*\.\.\.\s*\]|^\s*\.\.\.\s*$/i

function blank(s: unknown): boolean {
  return typeof s !== 'string' || !s.trim() || PLACEHOLDER.test(s)
}

/** Confere o resultado contra o pedido: quantidade, estrutura, alternativas e gabarito. */
export function validateActivities(
  activities: unknown,
  expected: { count: number; structure: StepKind[]; options: number },
): { ok: boolean; issues: ConfigIssue[]; activities: GeneratedActivity[] } {
  const issues: ConfigIssue[] = []
  if (!Array.isArray(activities)) {
    return { ok: false, issues: [{ code: 'shape', message: 'A resposta não tem a lista de atividades.' }], activities: [] }
  }
  if (activities.length !== expected.count) {
    issues.push({
      code: 'count',
      message: `Foram pedidas ${expected.count} atividades e vieram ${activities.length}.`,
    })
  }
  const letters = Array.from({ length: expected.options }, (_, i) => String.fromCharCode(65 + i))
  const out: GeneratedActivity[] = []
  activities.forEach((raw, ai) => {
    const a = (raw ?? {}) as { title?: unknown; steps?: unknown }
    const label = `Atividade ${ai + 1}`
    if (blank(a.title)) issues.push({ code: 'title', message: `${label}: título vazio.` })
    const steps = Array.isArray(a.steps) ? (a.steps as Array<Record<string, unknown>>) : []
    if (steps.length !== expected.structure.length) {
      issues.push({
        code: 'steps',
        message: `${label}: esperadas ${expected.structure.length} etapas e vieram ${steps.length}.`,
      })
    }
    const mapped: GeneratedStep[] = steps.map((s, si) => {
      const want = expected.structure[si]
      const kind: StepKind = s.kind === 'exercise' ? 'exercise' : 'content'
      if (want && kind !== want) {
        issues.push({
          code: 'kind',
          message: `${label}, etapa ${si + 1}: deveria ser ${want === 'exercise' ? 'exercício' : 'conteúdo'}.`,
        })
      }
      const content = typeof s.content === 'string' ? s.content.trim() : ''
      if (blank(content)) {
        issues.push({ code: 'empty', message: `${label}, etapa ${si + 1}: texto vazio ou placeholder.` })
      }
      const options = Array.isArray(s.options) ? (s.options as unknown[]).map((o) => String(o ?? '').trim()) : []
      const correct = typeof s.correct === 'string' ? s.correct.trim().toUpperCase().slice(0, 1) : ''
      if (kind === 'exercise') {
        if (options.length !== expected.options || options.some((o) => blank(o))) {
          issues.push({
            code: 'options',
            message: `${label}, etapa ${si + 1}: o exercício precisa de ${expected.options} alternativas preenchidas.`,
          })
        }
        if (!letters.includes(correct)) {
          issues.push({
            code: 'correct',
            message: `${label}, etapa ${si + 1}: gabarito deve ser uma letra de ${letters[0]} a ${letters[letters.length - 1]}.`,
          })
        }
      }
      return {
        kind,
        title: typeof s.title === 'string' ? s.title.trim() : '',
        content,
        options: kind === 'exercise' ? options : [],
        correct: kind === 'exercise' ? correct : '',
      }
    })
    out.push({ title: typeof a.title === 'string' ? a.title.trim() : '', steps: mapped })
  })
  return { ok: issues.length === 0, issues, activities: out }
}

function stripFence(text: string): string {
  const t = text.trim()
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)```$/i)
  return (m ? m[1]! : t).trim()
}

function parseActivities(text: string): unknown {
  const parsed = JSON.parse(stripFence(text)) as { activities?: unknown }
  return parsed?.activities
}

const REPAIR =
  'A geração anterior não cumpriu o pedido. Corrija e devolva APENAS o JSON completo e válido.\nProblemas:\n'

async function callModel(
  system: string,
  user: string,
  env: NodeJS.ProcessEnv,
  impl: typeof generateContentWithGemini,
  timeoutMs: number,
): Promise<GeminiGenerateResult> {
  return impl(
    {
      systemInstruction: system,
      userText: user,
      timeoutMs,
      generationConfig: {
        maxOutputTokens: 65536,
        temperature: 0.4,
        responseMimeType: 'application/json',
        responseSchema: ACTIVITIES_JSON_SCHEMA,
      },
    },
    env,
  )
}

/** Gera as atividades. Valida contra o pedido e tenta um reparo único. */
export async function generateActivitiesFromConfig(
  input: ConfigGenerateInput,
  env: NodeJS.ProcessEnv = process.env,
  impl: typeof generateContentWithGemini = generateContentWithGemini,
): Promise<ConfigGenerateResult> {
  const count = Math.max(1, Math.min(60, Number.parseInt(input.variables.atividades ?? '', 10) || 0))
  const options = Math.max(2, Math.min(6, Number.parseInt(input.variables.alternativas ?? '', 10) || 4))
  const empty = (k: PromptVariable) => clean(input.variables[k]) === NA
  if (
    empty('habilidades') &&
    empty('orientacoes') &&
    input.files.length === 0
  ) {
    return {
      ok: false,
      activities: [],
      issues: [],
      model: '',
      repaired: false,
      truncatedSources: false,
      error: 'Informe habilidades, orientações ou arquivos para gerar a prévia.',
    }
  }
  if (input.structure.length < 1 || !input.structure.includes('exercise')) {
    return {
      ok: false,
      activities: [],
      issues: [],
      model: '',
      repaired: false,
      truncatedSources: false,
      error: 'A estrutura precisa de pelo menos um exercício.',
    }
  }

  const extracted = input.files.length > 0 ? await extractDocuments(input.files) : null
  const sources = extracted ? formatSourcesForPrompt(extracted.docs) : ''
  const values = resolveVariables(
    { ...input.variables, atividades: String(count), alternativas: String(options) },
    sources,
  )

  let promptBody = FALLBACK_CRIAR_TRILHA_IA
  if (input.db) {
    const row = await getPromptBody(input.db, 'criar_trilha_ia', env)
    if (row.body.trim()) promptBody = row.body
  }

  const userText = buildGenerationMessage({
    prompt: promptBody,
    values,
    structure: input.structure,
    mode: input.mode,
    existingTitles: input.existingTitles ?? [],
    sources,
  })

  const base = {
    truncatedSources: extracted?.truncated ?? false,
    userText,
  }
  let model = ''
  let repaired = false
  const startedAt = Date.now()
  const perCallTimeoutMs = resolveTrailGenerateTimeoutMs(env)
  try {
    const first = await callModel(
      ACTIVITIES_SYSTEM,
      userText,
      env,
      impl,
      perCallTimeoutMs,
    )
    model = first.model
    let parsed: unknown
    try {
      parsed = parseActivities(first.text)
    } catch (e) {
      return {
        ok: false,
        activities: [],
        issues: [{ code: 'parse', message: e instanceof Error ? e.message : 'JSON inválido.' }],
        model,
        repaired: false,
        error: 'A resposta da IA não é um JSON válido.',
        ...base,
      }
    }
    let check = validateActivities(parsed, { count, structure: input.structure, options })
    if (!check.ok) {
      const repairTimeoutMs = remainingTrailGenerateTimeoutMs(
        startedAt,
        perCallTimeoutMs,
      )
      if (!canAffordTrailGenerateCall(repairTimeoutMs)) {
        return {
          ok: false,
          activities: [],
          issues: check.issues,
          model,
          repaired: false,
          error: 'A IA não conseguiu cumprir a estrutura pedida. Tente de novo.',
          ...base,
        }
      }
      repaired = true
      const second = await callModel(
        ACTIVITIES_SYSTEM,
        `${REPAIR}${check.issues.map((i) => `- ${i.message}`).join('\n')}\n\nPedido original:\n${userText}\n\nJSON anterior:\n${JSON.stringify(parsed)}`,
        env,
        impl,
        repairTimeoutMs,
      )
      model = second.model
      check = validateActivities(parseActivities(second.text), { count, structure: input.structure, options })
    }
    return {
      ok: check.ok,
      activities: check.ok ? check.activities : [],
      issues: check.issues,
      model,
      repaired,
      error: check.ok ? undefined : 'A IA não conseguiu cumprir a estrutura pedida. Tente de novo.',
      ...base,
    }
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e)
    return {
      ok: false,
      activities: [],
      issues: [],
      model,
      repaired,
      error: friendlyTrailGenerateError(raw),
      ...base,
    }
  }
}
