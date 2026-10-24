/**
 * Gate do card "Acerto médio" / aba Exercícios no Dados.
 * Evita flash "N/A sem exercícios" / "Exercícios (0)" / agregados parciais
 * enquanto alguma instituição selecionada ainda não carregou o summary.
 */

export type AccuracyGateInput = {
  selectedIdsKey: string
  selectedIds: string[]
  dataScopeKey: string
  loadingData: boolean
  /** Instituições cujo summary (answerMap) já chegou para o escopo atual. */
  logsReadyIds: ReadonlySet<string>
  /** Fetch de logs em voo para o escopo atual. */
  loadingLogs: boolean
  /**
   * true quando o fetch terminou e ao menos uma instituição selecionada
   * falhou sem cache — UI deve mostrar erro + tentar de novo, não N/A.
   */
  logsFailed: boolean
}

export type AccuracyGate = {
  /** Mostrar "Carregando…" em vez de N/A / 0%. */
  avgAccuracyLoading: boolean
  /** Todas as instituições selecionadas têm summary — pode publicar % ou N/A real. */
  canPublishAccuracy: boolean
  /** Contador de exercícios ainda não confiável. */
  exercisesLoading: boolean
  /** Todas as selecionadas prontas (mesmo se vazias). */
  allInstitutionsReady: boolean
}

export function dashboardAccuracyGate(input: AccuracyGateInput): AccuracyGate {
  const selected = input.selectedIds.filter(Boolean)
  const scopeReady =
    Boolean(input.selectedIdsKey) &&
    input.dataScopeKey === input.selectedIdsKey &&
    !input.loadingData

  const allInstitutionsReady =
    selected.length > 0 &&
    selected.every((id) => input.logsReadyIds.has(id))

  const canPublishAccuracy =
    scopeReady && allInstitutionsReady && !input.logsFailed

  // Enquanto falta alguma instituição OU ainda há fetch: Carregando.
  // Falha total: não fica em loading eterno (banner + retry).
  const avgAccuracyLoading =
    Boolean(input.selectedIdsKey) &&
    !input.logsFailed &&
    (!scopeReady || !allInstitutionsReady || input.loadingLogs)

  const exercisesLoading =
    Boolean(input.selectedIdsKey) &&
    !input.logsFailed &&
    (!allInstitutionsReady || input.loadingLogs || input.loadingData)

  return {
    avgAccuracyLoading,
    canPublishAccuracy,
    exercisesLoading,
    allInstitutionsReady,
  }
}

/** Início: só agrega acerto quando TODAS as instituições do filtro têm answerMap. */
export function inicioAcertoReady(
  scopedIds: string[],
  answerMaps: Map<string, Map<string, string>>,
): boolean {
  if (scopedIds.length === 0) return false
  return scopedIds.every((id) => answerMaps.has(id))
}
