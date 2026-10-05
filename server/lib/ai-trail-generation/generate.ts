import {
  generateContentWithGemini,
  type GeminiGenerateResult,
} from '../trail-ai/geminiClient.js'
import { getDefaultAiTrailPrompt } from './defaultPrompt.js'
import {
  extractDocuments,
  formatSourcesForPrompt,
  type UploadedDoc,
} from './extractText.js'
import { mapGeneratedTrailToDraft, type MappedTrailDraft } from './mapToTrailModel.js'
import { GENERATED_TRAIL_JSON_SCHEMA, SYSTEM_WRAPPER } from './schema.js'
import type { GeneratedTrail, ValidationIssue } from './types.js'
import { validateGeneratedTrail } from './validate.js'

export type GenerateAiTrailInput = {
  files: UploadedDoc[]
  /** Prompt editável; se vazio, usa o padrão. */
  prompt?: string
}

export type GenerateAiTrailResult = {
  ok: boolean
  trail: GeneratedTrail | null
  draft: MappedTrailDraft | null
  issues: ValidationIssue[]
  model: string
  repaired: boolean
  truncatedSources: boolean
  totalSourceChars: number
  rawText?: string
  error?: string
}

function stripJsonFence(text: string): string {
  const t = text.trim()
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)```$/i)
  return (m ? m[1]! : t).trim()
}

function parseTrailJson(text: string): GeneratedTrail {
  const cleaned = stripJsonFence(text)
  const parsed = JSON.parse(cleaned) as GeneratedTrail
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('JSON da trilha inválido.')
  }
  return parsed
}

function buildUserMessage(prompt: string, sources: string): string {
  return (
    `${prompt.trim()}\n\n` +
    `--------------------------------------------------------------------------------\n` +
    `FONTES (documentos enviados — use SOMENTE estas):\n\n` +
    `${sources}\n\n` +
    `--------------------------------------------------------------------------------\n` +
    `ENTREGUE AGORA o JSON completo da trilha (schema obrigatório). ` +
    `Preencha TODOS os blocos. Sem placeholders.`
  )
}

const REPAIR_INSTRUCTION =
  'A geração anterior violou regras estruturais. Corrija o JSON e devolva APENAS o JSON completo válido.\nProblemas:\n'

async function callModel(
  systemInstruction: string,
  userText: string,
  env: NodeJS.ProcessEnv,
  generateImpl: typeof generateContentWithGemini,
): Promise<GeminiGenerateResult> {
  return generateImpl(
    {
      systemInstruction,
      userText,
      generationConfig: {
        maxOutputTokens: 65536,
        temperature: 0.4,
        responseMimeType: 'application/json',
        responseSchema: GENERATED_TRAIL_JSON_SCHEMA,
      },
    },
    env,
  )
}

/**
 * Gera trilha estruturada a partir de documentos + prompt.
 * Valida; se falhar, tenta um repair único com a lista de erros.
 * NÃO grava no Firestore.
 */
export async function generateAiTrail(
  input: GenerateAiTrailInput,
  env: NodeJS.ProcessEnv = process.env,
  generateImpl: typeof generateContentWithGemini = generateContentWithGemini,
): Promise<GenerateAiTrailResult> {
  const extracted = await extractDocuments(input.files)
  const sources = formatSourcesForPrompt(extracted.docs)
  const prompt = (input.prompt?.trim() || getDefaultAiTrailPrompt()).trim()
  const userText = buildUserMessage(prompt, sources)

  let model = ''
  let rawText = ''
  let repaired = false

  try {
    const first = await callModel(SYSTEM_WRAPPER, userText, env, generateImpl)
    model = first.model
    rawText = first.text
  } catch (err) {
    return {
      ok: false,
      trail: null,
      draft: null,
      issues: [],
      model,
      repaired: false,
      truncatedSources: extracted.truncated,
      totalSourceChars: extracted.totalChars,
      error: err instanceof Error ? err.message : String(err),
    }
  }

  let trail: GeneratedTrail
  try {
    trail = parseTrailJson(rawText)
  } catch (err) {
    return {
      ok: false,
      trail: null,
      draft: null,
      issues: [
        {
          code: 'parse',
          message:
            err instanceof Error
              ? `Falha ao parsear JSON: ${err.message}`
              : 'Falha ao parsear JSON.',
        },
      ],
      model,
      repaired: false,
      truncatedSources: extracted.truncated,
      totalSourceChars: extracted.totalChars,
      rawText,
      error: 'Resposta da IA não é JSON válido.',
    }
  }

  let validation = validateGeneratedTrail(trail)
  if (!validation.ok) {
    repaired = true
    const repairUser =
      REPAIR_INSTRUCTION +
      validation.issues.map((i) => `- ${i.message}`).join('\n') +
      '\n\nJSON anterior:\n' +
      JSON.stringify(trail)
    try {
      const second = await callModel(SYSTEM_WRAPPER, repairUser, env, generateImpl)
      model = second.model
      rawText = second.text
      trail = parseTrailJson(rawText)
      validation = validateGeneratedTrail(trail)
    } catch (err) {
      return {
        ok: false,
        trail,
        draft: null,
        issues: validation.issues,
        model,
        repaired: true,
        truncatedSources: extracted.truncated,
        totalSourceChars: extracted.totalChars,
        rawText,
        error:
          err instanceof Error
            ? `Repair falhou: ${err.message}`
            : 'Repair falhou.',
      }
    }
  }

  if (!validation.ok) {
    return {
      ok: false,
      trail,
      draft: null,
      issues: validation.issues,
      model,
      repaired,
      truncatedSources: extracted.truncated,
      totalSourceChars: extracted.totalChars,
      rawText,
      error: 'Validação falhou após tentativa de correção.',
    }
  }

  const draft = mapGeneratedTrailToDraft(trail)
  return {
    ok: true,
    trail,
    draft,
    issues: [],
    model,
    repaired,
    truncatedSources: extracted.truncated,
    totalSourceChars: extracted.totalChars,
  }
}
