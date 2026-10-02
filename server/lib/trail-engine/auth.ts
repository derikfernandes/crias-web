import { TrailEngineError } from './errors'

/**
 * Auth de serviço para mutações do Trail Engine / student_trails.
 *
 * Env:
 * - `TRAIL_ENGINE_SERVICE_TOKEN` ou `CHATIS_SERVICE_TOKEN` — token esperado
 * - `TRAIL_ENGINE_ALLOW_ANON=1` — escape hatch (só emergência / local)
 *
 * Sem token configurado e sem ALLOW_ANON → 401 (não deixa avanço anónimo).
 */
export function assertServiceBearer(
  headers: Headers | { get(name: string): string | null },
): void {
  if (process.env.TRAIL_ENGINE_ALLOW_ANON === '1') {
    return
  }

  const expected = (
    process.env.TRAIL_ENGINE_SERVICE_TOKEN ||
    process.env.CHATIS_SERVICE_TOKEN ||
    ''
  ).trim()

  const raw =
    headers.get('authorization') ?? headers.get('Authorization') ?? ''
  const match = /^Bearer\s+(\S+)/i.exec(raw.trim())
  const provided = match?.[1]?.trim() ?? ''

  if (!expected) {
    throw new TrailEngineError(
      'unauthorized',
      'Service token não configurado (TRAIL_ENGINE_SERVICE_TOKEN). Mutações exigem Authorization Bearer.',
    )
  }

  if (!provided || provided !== expected) {
    throw new TrailEngineError(
      'unauthorized',
      'Authorization Bearer inválido ou ausente.',
    )
  }
}

export function isMutationMethod(method: string): boolean {
  const m = method.toUpperCase()
  return m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE'
}
