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
    title: 'Parceiro de estudo',
    description:
      'System prompt da conversa livre com o parceiro de estudo (app do aluno).',
  },
  gerador_trilha: {
    title: 'Gerador de bloco da trilha',
    description:
      'System prompt que gera o conteúdo pedagógico de cada bloco IA da trilha.',
  },
  criar_trilha_ia: {
    title: 'Criar trilha com IA (padrão)',
    description:
      'Prompt padrão editável no wizard “Criar trilha com IA”.',
  },
  criar_trilha_ia_system: {
    title: 'Criar trilha com IA (system wrapper)',
    description:
      'Instrução de sistema JSON/schema para geração estruturada de trilhas.',
  },
}

export function isAiPromptId(value: string): value is AiPromptId {
  return (AI_PROMPT_IDS as readonly string[]).includes(value)
}
