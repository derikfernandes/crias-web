import type { TrailChannel } from './types'

/**
 * Chave estável para strangler Chatis / retries HTTP.
 * Mesmo estado (posição + versão + intent) → mesma key → replay (I7).
 * Não usa UUID fresco.
 */
export function buildStableIdempotencyKey(parts: {
  channel: TrailChannel
  student_id: string
  trail_id: string
  intent: string
  stage: number
  question: number
  progress_version: number
  /** Ex.: targets de update_position */
  extra?: string
}): string {
  const base = [
    parts.channel,
    parts.student_id,
    parts.trail_id,
    parts.intent,
    String(parts.stage),
    String(parts.question),
    `v${parts.progress_version}`,
  ].join(':')
  return parts.extra ? `${base}:${parts.extra}` : base
}
