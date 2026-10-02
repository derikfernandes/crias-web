import type {
  DashboardOpportunityRowView,
  DashboardOpportunityTab,
} from '../../types/dashboardPageView'

export type LearningOpportunitiesSectionProps = {
  subjectLabel: string
  tab: DashboardOpportunityTab
  onTabChange: (tab: DashboardOpportunityTab) => void
  rows: DashboardOpportunityRowView[]
  note: string
}

const TABS: { id: DashboardOpportunityTab; label: string; dot: string }[] = [
  { id: 'err', label: 'Mais erros', dot: '#f5b0bd' },
  { id: 'duv', label: 'Dúvidas com o tutor', dot: 'var(--c-yellow)' },
  { id: 'hit', label: 'Mais acertos', dot: 'var(--c-green)' },
]

export function LearningOpportunitiesSection({
  subjectLabel,
  tab,
  onTabChange,
  rows,
  note,
}: LearningOpportunitiesSectionProps) {
  return (
    <section
      className="crias-gap"
      aria-label="Oportunidades de aprendizagem"
    >
      <div className="crias-gap__head">
        <div className="crias-label">Aprendizagem · {subjectLabel}</div>
        <h2
          className="crias-section-title"
          style={{ borderBottom: 0, paddingBottom: 0 }}
        >
          Onde estão as oportunidades de aprendizagem
        </h2>
      </div>

      <div className="crias-gap__tabs" role="tablist" aria-label="Tipo de oportunidade">
        {TABS.map((t) => {
          const on = t.id === tab
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              className={on ? 'crias-gap__tab crias-gap__tab--on' : 'crias-gap__tab'}
              onClick={() => onTabChange(t.id)}
            >
              <span
                className="crias-gap__dot"
                style={{ background: t.dot }}
              />
              {t.label}
            </button>
          )
        })}
      </div>

      <p className="crias-gap__note">{note}</p>

      {rows.length === 0 ? (
        <p className="muted crias-gap__empty">
          {tab === 'duv'
            ? 'Dúvidas por tema ainda não estão disponíveis (sem metadado de tópico no banco atual).'
            : 'Nenhum exercício com respostas suficientes neste filtro.'}
        </p>
      ) : (
        <ul className="crias-gap__list">
          {rows.map((row) => (
            <li key={`${row.rank}-${row.tag}-${row.title}`}>
              {row.href ? (
                <a href={row.href} className={`crias-gap__row crias-gap__row--${row.tone}`}>
                  <GapRowBody row={row} />
                </a>
              ) : (
                <div className={`crias-gap__row crias-gap__row--${row.tone}`}>
                  <GapRowBody row={row} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function GapRowBody({ row }: { row: DashboardOpportunityRowView }) {
  return (
    <>
      <span className="crias-gap__rank">{row.rank}</span>
      <span className="crias-gap__body">
        <span className="crias-gap__tags">
          <span className="crias-gap__tag">{row.tag}</span>
          {row.tag2 ? (
            <span className="crias-gap__tag2">{row.tag2}</span>
          ) : null}
        </span>
        <strong className="crias-gap__title">{row.title}</strong>
        {row.detail ? (
          <span className="crias-gap__detail">{row.detail}</span>
        ) : null}
      </span>
      <span className={`crias-gap__value crias-gap__value--${row.tone}`}>
        <strong>{row.value}</strong>
        <span>{row.valueSub}</span>
      </span>
    </>
  )
}
