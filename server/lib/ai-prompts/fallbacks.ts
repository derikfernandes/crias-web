import { DEFAULT_AI_TRAIL_PROMPT } from '../ai-trail-generation/defaultPrompt.js'
import { SYSTEM_WRAPPER } from '../ai-trail-generation/schema.js'
import { MARIA_TUTORA_SYSTEM_PROMPT } from '../maria/mariaTutoraPrompt.js'
import { GERADOR_TRILHA_SYSTEM_PROMPT } from '../trail-ai/geradorSystemPrompt.js'
import type { AiPromptId } from './ids.js'

/** Fallbacks mínimos embutidos — usados só se o doc Firestore estiver ausente. */
export function getFallbackPromptBody(id: AiPromptId): string {
  switch (id) {
    case 'parceiro_estudo':
      return MARIA_TUTORA_SYSTEM_PROMPT.trim()
    case 'gerador_trilha':
      return GERADOR_TRILHA_SYSTEM_PROMPT.trim()
    case 'criar_trilha_ia':
      return DEFAULT_AI_TRAIL_PROMPT.trim()
    case 'criar_trilha_ia_system':
      return SYSTEM_WRAPPER.trim()
    default: {
      const _exhaustive: never = id
      return _exhaustive
    }
  }
}
