export type CrossOpportunityCard = {
  key: string
  aula: string
  tema: string
  accuracyPct: number
  doubtsLabel: string
  onOpen?: () => void
}

export type CrossOpportunitiesSectionProps = {
  cards: CrossOpportunityCard[]
  note?: string | null
}

export function CrossOpportunitiesSection({
  cards,
  note,
}: CrossOpportunitiesSectionProps) {
  if (cards.length === 0) return null

  return (
    <div className="crias-cross">
      <div className="crias-label">Oportunidades mais prováveis</div>
      <h3 className="crias-cross__title">
        Erro alto e dúvida frequente no mesmo conteúdo
      </h3>
      {note ? <p className="crias-cross__note">{note}</p> : null}
      <div className="crias-cross__grid">
        {cards.map((c) => (
          <button
            key={c.key}
            type="button"
            className="crias-cross__card"
            onClick={c.onOpen}
          >
            <span className="crias-cross__aula">{c.aula}</span>
            <span className="crias-cross__tema">Tema: {c.tema}</span>
            <span className="crias-cross__metrics">
              <span>
                <span className="crias-cross__metric-label">Acerto</span>
                <strong className="crias-cross__acc">{c.accuracyPct}%</strong>
              </span>
              <span>
                <span className="crias-cross__metric-label">Dúvidas</span>
                <strong>{c.doubtsLabel}</strong>
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
