/**
 * Fingerprint estável do conteúdo entregue numa posição.
 * Usado em `last_delivered` para evitar re-push cross-channel.
 */
export function contentFingerprint(input: {
  trail_id: string
  stage_number: number
  question_number: number
  stage_type?: string | null
  content?: string | null
  prompt?: string | null
  updated_at?: string | number | null
}): string {
  const parts = [
    input.trail_id,
    String(input.stage_number),
    String(input.question_number),
    input.stage_type ?? '',
    hashSnippet(input.content ?? ''),
    hashSnippet(input.prompt ?? ''),
    input.updated_at == null ? '' : String(input.updated_at),
  ]
  return parts.join(':')
}

/** Hash curto não-criptográfico para manter o fingerprint compacto. */
function hashSnippet(text: string): string {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}
