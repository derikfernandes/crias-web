/**
 * Gate do card "Acerto médio" / aba Exercícios no Dados.
 * Evita flash "N/A sem exercícios" / "Exercícios (0)" durante troca de filtro
 * quando a resposta antiga ainda não foi substituída ou o summary ainda sobe.
 */

export type AccuracyGateInput = {
  selectedIdsKey: string
  dataScopeKey: string
  logsScopeKey: string
  loadingData: boolean
  loadingLogs: boolean
  answerMapSize: number
}

export type AccuracyGate = {
  /** Mostrar "Carregando…" em vez de N/A. */
  avgAccuracyLoading: boolean
  /** Escopo de dados + logs pronto para publicar % ou N/A real. */
  canPublishAccuracy: boolean
  /** Contador de exercícios ainda não confiável. */
  exercisesLoading: boolean
}

export function dashboardAccuracyGate(input: AccuracyGateInput): AccuracyGate {
  const scopeReady =
    Boolean(input.selectedIdsKey) &&
    input.dataScopeKey === input.selectedIdsKey &&
    !input.loadingData
  const logsReady =
    Boolean(input.selectedIdsKey) &&
    input.logsScopeKey === input.selectedIdsKey &&
    !input.loadingLogs
  const avgAccuracyLoading =
    Boolean(input.selectedIdsKey) &&
    (!scopeReady ||
      !logsReady ||
      (input.loadingLogs && input.answerMapSize === 0))
  const exercisesLoading =
    input.loadingLogs ||
    input.logsScopeKey !== input.selectedIdsKey ||
    (input.loadingData && input.answerMapSize === 0)

  return {
    avgAccuracyLoading,
    canPublishAccuracy: scopeReady && logsReady,
    exercisesLoading,
  }
}
