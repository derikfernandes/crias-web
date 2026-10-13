/**
 * C3-R12 N02: `navigator.onLine` / evento `online` podem mentir (wifi sem rota).
 * Só tratar como online após um fetch que obtenha resposta HTTP.
 */

const PING_TIMEOUT_MS = 4_000

function pingUrl(): string {
  const base = (
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''
  ).replace(/\/$/, '')
  // student_id inválido ainda devolve HTTP — prova reachability.
  return `${base}/student_trails?student_id=__crias_ping__`
}

/** true = rede alcançável; false = morta / abort / TypeError. */
export async function confirmOnline(
  timeoutMs = PING_TIMEOUT_MS,
): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    await fetch(pingUrl(), {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    })
    return true
  } catch {
    return false
  } finally {
    window.clearTimeout(timer)
  }
}
