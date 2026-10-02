/** Empty state quando nenhum KPI da Visão geral está aberto. */
export function KpiDetailEmpty() {
  return (
    <div className="crias-kpi-empty" role="status">
      <div className="crias-kpi-empty__icon" aria-hidden="true">
        <svg
          width="56"
          height="56"
          viewBox="0 0 56 56"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="8" y="28" width="10" height="20" fill="currentColor" />
          <rect x="23" y="18" width="10" height="30" fill="currentColor" />
          <rect x="38" y="8" width="10" height="40" fill="currentColor" />
          <path
            d="M40 8 L48 8 L44 2 Z"
            fill="currentColor"
            opacity="0.45"
          />
        </svg>
      </div>
      <h2 className="crias-kpi-empty__title">
        Clique em um indicador para ver os detalhes
      </h2>
      <p className="crias-kpi-empty__body">
        Escolha um dos indicadores acima para carregar as análises, gráficos e
        informações detalhadas.
      </p>
    </div>
  )
}
