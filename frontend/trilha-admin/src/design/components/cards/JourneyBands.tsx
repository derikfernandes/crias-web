import type { DashboardJourneyBandView } from '../../types/dashboardPageView'

export type JourneyBandsProps = {
  bands: DashboardJourneyBandView[]
  stalledHref?: string | null
  stalledLinkLabel?: string | null
}

const DEFAULT_COLOR: Record<DashboardJourneyBandView['key'], string> = {
  notStarted: 'var(--c-n-300)',
  start: 'var(--c-yellow-200)',
  mid: '#ffe566',
  final: 'var(--c-yellow-800)',
  completed: 'var(--c-green)',
  stalled: 'var(--c-rose-300)',
}

const DEFAULT_CRIT: Record<DashboardJourneyBandView['key'], string> = {
  notStarted: '0 conteúdos concluídos',
  start: '1% a 33% dos conteúdos liberados',
  mid: '34% a 66%',
  final: '67% a 99%',
  completed: '100% dos conteúdos liberados',
  stalled: 'sem interação há 7 dias ou mais',
}

export function JourneyBands({
  bands,
  stalledHref,
  stalledLinkLabel,
}: JourneyBandsProps) {
  // Parado 7+ não entra na barra (só no link), como no protótipo HTML.
  const visible = bands.filter((b) => b.key !== 'stalled' && b.count > 0)
  if (visible.length === 0) return null
  const total = visible.reduce((a, b) => a + b.count, 0) || 1

  return (
    <section className="crias-journey" aria-label="Situação dos alunos">
      <div className="crias-journey__head">
        <div>
          <div className="crias-label">Situação dos alunos</div>
          <h2
            className="crias-section-title"
            style={{ borderBottom: 0, paddingBottom: 0 }}
          >
            Onde cada aluno está
          </h2>
        </div>
        {stalledHref && stalledLinkLabel ? (
          <a href={stalledHref} className="crias-journey__stalled-link">
            {stalledLinkLabel} →
          </a>
        ) : null}
      </div>

      <div className="crias-journey__stack" aria-hidden="true">
        {visible.map((band) => (
          <span
            key={band.key}
            style={{
              flex: `${band.count} 1 0`,
              minWidth: 4,
              background: band.color ?? DEFAULT_COLOR[band.key],
            }}
          />
        ))}
      </div>

      <div className="crias-journey__cells">
        {visible.map((band) => {
          const pct = Math.round((band.count / total) * 100)
          const color = band.color ?? DEFAULT_COLOR[band.key]
          const body = (
            <>
              <span className="crias-journey__cell-label">
                <span
                  className="crias-journey__swatch"
                  style={{ background: color }}
                />
                <strong>{band.label}</strong>
              </span>
              <span className="crias-journey__cell-pct">{pct}%</span>
              <span className="crias-journey__cell-count">
                {band.count.toLocaleString('pt-BR')} alunos
              </span>
              <span className="crias-journey__cell-crit">
                {band.criterion ?? DEFAULT_CRIT[band.key]}
              </span>
            </>
          )
          const href = band.href
          return href ? (
            <a key={band.key} href={href} className="crias-journey__cell">
              {body}
            </a>
          ) : (
            <div key={band.key} className="crias-journey__cell">
              {body}
            </div>
          )
        })}
      </div>
    </section>
  )
}
