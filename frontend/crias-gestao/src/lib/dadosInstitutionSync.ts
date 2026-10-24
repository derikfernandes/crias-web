/**
 * Regras de sync do filtro de instituições na página Dados.
 *
 * Bug histórico: com exatamente 1 id no topo (troca via nome), um efeito
 * "pin" fazia setSelectedIds({selectedIdAntigo}) e a seleção voltava atrás.
 * Com multi/vazio, aí sim o topo deve pinar no selectedId da página.
 */
export function shouldPinTopFilterToSelectedId(selectedIdsSize: number): boolean {
  return selectedIdsSize !== 1
}

/**
 * Só reaplicar URL→topo quando o topo ainda não é exatamente {urlId}.
 * Chamar setSelectedIds sempre (mesmo com os mesmos ids) recriava Sets e
 * gerava "Maximum update depth exceeded".
 */
export function shouldSyncTopFilterFromUrl(
  urlId: string | null,
  selectedIds: Set<string>,
): boolean {
  if (!urlId) return false
  return !(selectedIds.size === 1 && selectedIds.has(urlId))
}
