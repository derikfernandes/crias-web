import { TRAIL_AI_SPACING_RULES } from './formatAiAnswer'
import { GERADOR_TRILHA_SYSTEM_PROMPT } from './geradorSystemPrompt'

export type TrailAiPromptInput = {
  name: string
  school_grade: string
  student_level: string | number
  prompt: string
  content: string
  /** Conversas recentes tutor/trilha (conversation_logs). */
  context: string
  trail_title?: string | null
}

export type BuiltTrailAiPrompt = {
  systemInstruction: string
  userText: string
}

function firstName(raw: string): string {
  const t = String(raw ?? '').trim()
  if (!t) return ''
  return t.split(/\s+/)[0] ?? ''
}

function applyVars(
  template: string,
  vars: Record<string, string>,
): string {
  let out = template
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`\${${key}}`).join(value)
  }
  return out
}

/**
 * Monta o pedido Gemini com o prompt gerador + variáveis:
 * NAME, SCHOOL_GRADE, STUDENT_LEVEL, CONTEXT, PROMPT, CONTENT.
 */
export function buildTrailAiPrompt(input: TrailAiPromptInput): BuiltTrailAiPrompt {
  const name = firstName(String(input.name ?? '').trim())
  const schoolGrade = String(input.school_grade ?? '').trim()
  const level = String(input.student_level ?? '').trim() || '2'
  const prompt = String(input.prompt ?? '').trim()
  const content = String(input.content ?? '').trim()
  const context = String(input.context ?? '').trim()
  const title = String(input.trail_title ?? '').trim()

  const systemInstruction = [
    applyVars(GERADOR_TRILHA_SYSTEM_PROMPT, {
      NAME: name,
      SCHOOL_GRADE: schoolGrade,
      STUDENT_LEVEL: level,
      CONTEXT: context || '(sem histórico recente)',
      PROMPT: prompt || '(vazio)',
      CONTENT: content || '(vazio)',
    }),
    TRAIL_AI_SPACING_RULES,
    title ? `Título da etapa: ${title}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  const userText = [
    `NAME: ${name || '(vazio)'}`,
    `SCHOOL_GRADE: ${schoolGrade || '(vazio)'}`,
    `STUDENT_LEVEL: ${level}`,
    `PROMPT: ${prompt || '(vazio)'}`,
    `CONTENT: ${content || '(vazio)'}`,
    'CONTEXT (conversas recentes tutor/trilha):',
    context || '(sem histórico recente)',
    'Gere o conteúdo pedagógico deste bloco da trilha agora.',
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
