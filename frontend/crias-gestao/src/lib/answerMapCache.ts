/**
 * Cache em memória do answerMap (dashboard_summary) por institution_id.
 * Compartilhado entre Início e prefetch — evita refetch de 14–19s a cada visita.
 */

const cache = new Map<string, Map<string, string>>()
const loadedAt = new Map<string, number>()

/** TTL de revalidação em background (stale-while-revalidate). */
export const ANSWER_MAP_SWR_MS = 5 * 60 * 1000

export function getCachedAnswerMap(
  institutionId: string,
): Map<string, string> | undefined {
  return cache.get(institutionId)
}

export function isAnswerMapFresh(institutionId: string): boolean {
  const t = loadedAt.get(institutionId)
  if (t == null) return false
  return Date.now() - t < ANSWER_MAP_SWR_MS
}

export function setCachedAnswerMap(
  institutionId: string,
  answerMap: Map<string, string>,
): void {
  cache.set(institutionId, answerMap)
  loadedAt.set(institutionId, Date.now())
}

/** Só testes. */
export function clearAnswerMapCache(): void {
  cache.clear()
  loadedAt.clear()
}
