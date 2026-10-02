/** Exercício candidato a menor/maior acerto na Visão geral. */
export type ContentExercisePick = {
  label: string
  pct: number
  note: string
  contentKey: string
  exKey: string
}

/**
 * Escolhe exercícios distintos de menor e maior acerto.
 * O “maior” só existe se houver % estritamente maior que o menor —
 * assim os cards nunca repetem o mesmo exercício nem o mesmo %.
 */
export function pickContentExerciseExtrema(
  pool: ContentExercisePick[],
): { lowest: ContentExercisePick | null; highest: ContentExercisePick | null } {
  if (pool.length === 0) return { lowest: null, highest: null }

  const sorted = pool
    .slice()
    .sort((a, b) => a.pct - b.pct || a.exKey.localeCompare(b.exKey))

  const lowest = sorted[0] ?? null
  const highest = lowest
    ? [...sorted]
        .reverse()
        .find((e) => e.exKey !== lowest.exKey && e.pct > lowest.pct) ?? null
    : null

  return { lowest, highest }
}
