/** Compara dois conjuntos de ids sem depender da identidade do Set. */
export function sameIdSet(
  a: Set<string> | null | undefined,
  b: Set<string> | Iterable<string>,
): boolean {
  if (!a) return false
  const next = b instanceof Set ? b : new Set(b)
  if (a.size !== next.size) return false
  for (const id of next) {
    if (!a.has(id)) return false
  }
  return true
}
