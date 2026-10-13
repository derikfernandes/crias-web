export type DocPageViewProps = {
  /** Base URL da API já normalizada (sem barra final). */
  baseUrl: string
  /** Origem pública do painel em produção. */
  appOrigin: string
  /** Exibe o hint de VITE_API_BASE_URL quando a base veio do padrão. */
  showDefaultBaseHint: boolean
}
