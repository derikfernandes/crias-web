/**
 * Timeouts da geração de trilha (Nova trilha / Gerar prévia).
 * Rota `api/ai_trail_generate` tem maxDuration 300s — geração + reparo cabem nesse orçamento.
 */

/** Default por chamada Gemini (~2 min). Override: TRAIL_GENERATE_TIMEOUT_MS. */
export const DEFAULT_TRAIL_GENERATE_TIMEOUT_MS = 125_000

/**
 * Orçamento total sob o maxDuration 300s (margem para parse/extract/resposta).
 * A 2ª chamada (reparo) só roda se ainda houver tempo restante ≥ 5s.
 */
export const TRAIL_GENERATE_ROUTE_BUDGET_MS = 290_000

const MIN_CALL_MS = 5_000

export function resolveTrailGenerateTimeoutMs(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw =
    typeof env.TRAIL_GENERATE_TIMEOUT_MS === 'string'
      ? env.TRAIL_GENERATE_TIMEOUT_MS.trim()
      : ''
  const n = raw ? Number.parseInt(raw, 10) : NaN
  return Number.isFinite(n) && n >= MIN_CALL_MS
    ? Math.floor(n)
    : DEFAULT_TRAIL_GENERATE_TIMEOUT_MS
}

/** Tempo restante do orçamento da rota, limitado ao timeout por chamada. */
export function remainingTrailGenerateTimeoutMs(
  startedAtMs: number,
  perCallTimeoutMs: number,
  nowMs: number = Date.now(),
  budgetMs: number = TRAIL_GENERATE_ROUTE_BUDGET_MS,
): number {
  const remaining = budgetMs - (nowMs - startedAtMs)
  return Math.min(perCallTimeoutMs, Math.max(0, remaining))
}

export function canAffordTrailGenerateCall(remainingMs: number): boolean {
  return remainingMs >= MIN_CALL_MS
}

/** Mensagem de UI/API quando a IA estoura o tempo (sem detalhes técnicos). */
export const TRAIL_GENERATE_TIMEOUT_USER_MESSAGE =
  'A geração demorou demais. Tente de novo em instantes.'

export function isTrailGenerateTimeoutError(message: string): boolean {
  return /generateContent timeout|timeout após|aborted due to timeout|The operation was aborted/i.test(
    message,
  )
}

export function friendlyTrailGenerateError(message: string): string {
  if (isTrailGenerateTimeoutError(message)) {
    return TRAIL_GENERATE_TIMEOUT_USER_MESSAGE
  }
  return message
}
