/**
 * IDs estáveis dos prompts editáveis no Master (Firestore `ai_prompts`).
 * O código só mantém fallback se o doc estiver ausente.
 *
 * Nota: `spacing_rules` (marcador |||) foi retirado — espaçamento fica
 * nas regras 6.6 dos prompts gerador/parceiro + conversão defensiva em
 * formatAiAnswer.
 */
export const AI_PROMPT_IDS = [
  'parceiro_estudo',
  'gerador_trilha',
  'criar_trilha_ia',
  'criar_trilha_ia_system',
] as const

export type AiPromptId = (typeof AI_PROMPT_IDS)[number]

/** Docs legados que o runtime deixa de usar e tenta aposentar no Firestore. */
export const RETIRED_AI_PROMPT_IDS = ['spacing_rules'] as const

export const AI_PROMPT_META: Record<
  AiPromptId,
  { title: string; description: string }
> = {
  parceiro_estudo: {
    title: 'Monitor',
    description:
      'System prompt da conversa livre com o monitor (app do aluno).',
  },
  gerador_trilha: {
    title: 'Gerador de etapas da trilha',
    description:
      'System prompt que gera o conteúdo pedagógico de cada etapa de IA da trilha.',
  },
  criar_trilha_ia: {
    title: 'Criar trilha com IA (fixo do sistema)',
    description:
      'Não editável e invisível para a escola. Na geração, o sistema soma este texto à Configuração de geração preenchida pelo usuário.',
  },
  criar_trilha_ia_system: {
    title: 'Instruções do sistema',
    description:
      'Instrução de sistema JSON/schema para geração estruturada de trilhas.',
  },
}

export function isAiPromptId(value: string): value is AiPromptId {
  return (AI_PROMPT_IDS as readonly string[]).includes(value)
}
