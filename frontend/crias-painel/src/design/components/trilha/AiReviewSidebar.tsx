export type AiReviewSidebarProps = {
  onOpenHistory?: () => void
}

const FIX_POINTS = [
  'Leia o texto com calma antes de continuar.',
  'Anote uma ideia que você levaria para a vida real.',
  'Se tiver dúvida, use o WhatsApp — tutores não ficam neste painel.',
]

export function AiReviewSidebar({ onOpenHistory }: AiReviewSidebarProps) {
  return (
    <aside
      className="trilha-ai-review"
      aria-labelledby="trilha-ai-review-title"
    >
      <h2 id="trilha-ai-review-title" className="trilha-ai-review__title">
        Revisão da atividade
      </h2>
      <p className="trilha-ai-review__lead muted">
        Atividade com IA — use este painel para fixar o essencial (não é chat).
      </p>
      <ul className="trilha-ai-review__list">
        {FIX_POINTS.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {onOpenHistory ? (
        <button
          type="button"
          className="btn btn--ghost btn--small trilha-ai-review__link"
          onClick={onOpenHistory}
        >
          Abrir revisão completa
        </button>
      ) : null}
    </aside>
  )
}
