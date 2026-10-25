import { sameIdSet } from './sameIdSet'

/**
 * Sync do filtro de instituições (topo) com Dados / URL.
 *
 * Regras:
 * - Checkbox = multi-select real (mínimo 1).
 * - Nunca colapsar multi → 1 (isso fazia “clico e desmarca”).
 * - Vazio → restaurar fallback (último / URL / primeira).
 * - URL `?inst=` aceita um id ou lista `i1,i2,i4`.
 */

/** Só restaura o topo quando ficou vazio (nunca quando há 2+). */
export function shouldRestoreTopFilterWhenEmpty(
  selectedIdsSize: number,
): boolean {
  return selectedIdsSize === 0
}

/**
 * @deprecated Nome antigo do pin que colapsava multi. Sempre false para size>=1.
 * Mantido nos testes de regressão: pin com size===2 deve ser false.
 */
export function shouldPinTopFilterToSelectedId(selectedIdsSize: number): boolean {
  // Antes: `return selectedIdsSize !== 1` (bug: desmarca o 2º checkbox).
  return selectedIdsSize === 0
}

export function parseInstParam(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of raw.split(',')) {
    const id = part.trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

export function formatInstParam(ids: Iterable<string>): string {
  return [...new Set(ids)].filter(Boolean).sort().join(',')
}

/**
 * URL → topo: só se o conjunto da URL for válido e diferente do atual.
 * Se o topo já é multi e a URL ainda tem um único id que está no topo,
 * a URL está atrasada (write pendente) — não colapsar.
 */
export function shouldSyncTopFilterFromUrlIds(
  urlIds: string[],
  selectedIds: Set<string>,
): boolean {
  if (urlIds.length === 0) return false
  if (sameIdSet(selectedIds, urlIds)) return false
  if (
    selectedIds.size > 1 &&
    urlIds.length === 1 &&
    selectedIds.has(urlIds[0]!)
  ) {
    return false
  }
  return true
}

/**
 * Compat: URL com um único id. Não sincronizar se o topo já é multi
 * (senão `?inst=i1` com topo {i1,i2} colapsa de volta para {i1}).
 */
export function shouldSyncTopFilterFromUrl(
  urlId: string | null,
  selectedIds: Set<string>,
): boolean {
  if (!urlId) return false
  if (selectedIds.size > 1) return false
  return !(selectedIds.size === 1 && selectedIds.has(urlId))
}

/** Toggle com mínimo de selecionados (ex.: instituições ≥ 1). */
export function toggleIdInSet(
  selected: Set<string>,
  id: string,
  minSelected = 0,
): Set<string> {
  const next = new Set(selected)
  if (next.has(id)) {
    if (next.size <= minSelected) return selected
    next.delete(id)
  } else {
    next.add(id)
  }
  return next
}
