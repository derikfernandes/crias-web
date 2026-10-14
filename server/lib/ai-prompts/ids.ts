/**
 * IDs estáveis dos prompts editáveis no Master (Firestore `ai_prompts`).
 * O código só mantém fallback se o doc estiver ausente.
 */
export const AI_PROMPT_IDS = [
  'parceiro_estudo',
  'gerador_trilha',
  'spacing_rules',
  'criar_trilha_ia',
  'criar_trilha_ia_system',
] as const

export type AiPromptId = (typeof AI_PROMPT_IDS)[number]

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
    title: 'Gerador de bloco da trilha',
    description:
      'System prompt que gera o conteúdo pedagógico de cada bloco IA da trilha.',
  },
  spacing_rules: {
    title: 'Regras de espaçamento (| | |)',
    description:
      'Instrução tipográfica partilhada (marcador ||| → parágrafo).',
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
