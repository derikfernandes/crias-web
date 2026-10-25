/** Frescor pedido pelo owner: refetch/warm a cada 10 min. */
export const METRICS_FRESH_MS = 10 * 60_000

/**
 * Rótulo de UI: "Atualizado às HH:MM" no fuso America/Sao_Paulo
 * (horário de Brasília). Sem travessão.
 */
export function formatAtualizadoAs(
  computedAtMs: number | null | undefined,
): string | null {
  if (
    computedAtMs == null ||
    !Number.isFinite(computedAtMs) ||
    computedAtMs <= 0
  ) {
    return null
  }
  try {
    const hm = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(computedAtMs))
    return `Atualizado às ${hm}`
  } catch {
    return null
  }
}

/** Com várias instituições: usa o `computed_at` mais antigo. */
export function oldestComputedAt(
  times: Array<number | null | undefined>,
): number | null {
  let min: number | null = null
  for (const t of times) {
    if (t == null || !Number.isFinite(t) || t <= 0) continue
    if (min == null || t < min) min = t
  }
  return min
}

/**
 * Carimbo estável: pina no 1º settle; SWR não altera.
 * Após Atualizar (force), só re-pina se o novo oldest for **mais recente**.
 */
export function nextPinnedComputedAt(input: {
  scopeKey: string
  liveOldest: number | null
  pinned: { key: string; ms: number } | null
  /** true enquanto Atualizar está em voo — não re-pina o valor velho. */
  forceInFlight?: boolean
  /** Após force: força adotar liveOldest (mesmo que igual por empate raro). */
  adoptAfterForce?: boolean
}): { key: string; ms: number } | null {
  const { scopeKey, liveOldest, pinned, forceInFlight, adoptAfterForce } = input
  if (!scopeKey || liveOldest == null) {
    return pinned?.key === scopeKey ? pinned : null
  }
  if (forceInFlight) {
    // Mantém o pin anterior do escopo (ou null) — não gruda o carimbo pré-force.
    return pinned?.key === scopeKey ? pinned : null
  }
  if (adoptAfterForce) {
    return { key: scopeKey, ms: liveOldest }
  }
  if (!pinned || pinned.key !== scopeKey) {
    return { key: scopeKey, ms: liveOldest }
  }
  return pinned
}
