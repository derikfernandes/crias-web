import { TRAIL_AI_SPACING_RULES } from './formatAiAnswer'

export type TrailAiPromptInput = {
  name: string
  student_level: string | number
  prompt: string
  content: string
  /** Conversas recentes tutor/trilha (mesmo SoT que o WA: conversation_logs). */
  context: string
  trail_title?: string | null
}

export type BuiltTrailAiPrompt = {
  systemInstruction: string
  userText: string
}

/**
 * Monta o pedido Gemini alinhado às variáveis Chatis:
 * NAME, STUDENT_LEVEL, PROMPT, CONTENT + CONTEXT + regras |||.
 */
export function buildTrailAiPrompt(input: TrailAiPromptInput): BuiltTrailAiPrompt {
  const name = String(input.name ?? '').trim() || 'Aluno'
  const level = String(input.student_level ?? '').trim() || '2'
  const prompt = String(input.prompt ?? '').trim()
  const content = String(input.content ?? '').trim()
  const context = String(input.context ?? '').trim()
  const title = String(input.trail_title ?? '').trim()

  const systemInstruction = [
    'És o gerador de conteúdo da trilha CRIAS (mesmo papel do agente de trilha no WhatsApp).',
    'Gera a aula em português do Brasil, clara e adequada ao nível do aluno.',
    'Usa formatação WhatsApp: *negrito* e _itálico_.',
    TRAIL_AI_SPACING_RULES,
    title ? `Título da etapa: ${title}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  const userText = [
    `NAME: ${name}`,
    `STUDENT_LEVEL: ${level}`,
    `PROMPT: ${prompt || '(vazio)'}`,
    `CONTENT: ${content || '(vazio)'}`,
    'CONTEXT (conversas recentes tutor/trilha):',
    context || '(sem histórico recente)',
  ].join('\n\n')

  return { systemInstruction, userText }
}

export type ContextLogLine = {
  sender: string
  message_text: string
  stage_number?: number
  question_number?: number
}

/** Formata logs recentes no bloco CONTEXT (mais antigo → mais recente). */
export function formatContextFromLogs(
  logs: ContextLogLine[],
  limit = 20,
): string {
  const slice = logs.slice(-Math.max(1, limit))
  return slice
    .map((l) => {
      const pos =
        typeof l.stage_number === 'number' && typeof l.question_number === 'number'
          ? `[S${l.stage_number} Q${l.question_number}] `
          : ''
      const who = l.sender === 'student' ? 'Aluno' : 'Sistema'
      const text = String(l.message_text ?? '').trim()
      return `${pos}${who}: ${text}`
    })
    .filter((line) => !line.endsWith(': '))
    .join('\n')
}
