/**
 * P0 dérik: IA (ensure-ai / Gemini) só no CTA Continuar DENTRO do player.
 * Resume / open / refresh / getNextContent → só GET (último log / pending), zero POST.
 */

export type AiEnsureTrigger = 'open' | 'continue'

export type AiGateContent = {
  stage_type?: string | null
  ai_status?: string | null
}

/** True só no clique Continuar (player) com célula ai ainda sem delivery. */
export function shouldEnsureAiOnTrigger(
  content: AiGateContent,
  trigger: AiEnsureTrigger,
): boolean {
  if (trigger !== 'continue') return false
  return content.stage_type === 'ai' && content.ai_status === 'pending'
}

/**
 * Aplica o gate: em `open` devolve o payload GET intacto;
 * em `continue` + pending chama `ensure` (POST ensure-ai).
 */
export async function resolveAiDeliveryForTrigger<T extends AiGateContent>(
  content: T,
  trigger: AiEnsureTrigger,
  ensure: () => Promise<T>,
): Promise<T> {
  if (!shouldEnsureAiOnTrigger(content, trigger)) {
    return content
  }
  return ensure()
}
