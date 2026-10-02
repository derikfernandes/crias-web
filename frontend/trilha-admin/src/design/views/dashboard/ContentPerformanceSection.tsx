import { useState } from 'react'
import type {
  DashboardContentBarView,
  DashboardContentSummaryView,
} from '../../types/dashboardPageView'
import { formatPct } from './formatPct'
import { IconTarget, IconTrendUp } from '../../components/icons/KpiIcons'

export type ContentPerformanceSectionProps = {
  summary: DashboardContentSummaryView
  bars: DashboardContentBarView[]
  selectedKey: string | null
  onSelectKey: (key: string | null) => void
}

function IconAlertLocal() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  )
}

function IconTrophyLocal() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  )
}

export function ContentPerformanceSection({
  summary,
  bars,
  selectedKey,
  onSelectKey,
}: ContentPerformanceSectionProps) {
  const [hoverKey, setHoverKey] = useState<string | null>(null)
  if (bars.length === 0) return null

  const selected =
    bars.find((b) => b.key === selectedKey && b.released) ?? null
  const hovered = bars.find((b) => b.key === hoverKey) ?? null
  const tip = hovered

  const colW = Math.max(36, Math.min(56, Math.floor(900 / Math.max(1, bars.length))))
  const plotWidth = bars.length * colW

  return (
    <section
      className="crias-content"
      aria-label="Como a turma está em cada conteúdo"
    >
      <div className="crias-content__head">
        <div>
          <div className="crias-label">
            Conteúdos · {summary.releasedCount} de {summary.totalCount}{' '}
            liberados
          </div>
          <h2
            className="crias-section-title"
            style={{ borderBottom: 0, paddingBottom: 0 }}
          >
            Como a turma está em cada conteúdo
          </h2>
        </div>
      </div>

      <div className="crias-content__sum">
        <div className="crias-content__sum-item">
          <span className="crias-content__sum-label">
            <span className="crias-kpi__icon">
              <IconTrendUp />
            </span>
            Progresso médio
          </span>
          <span className="crias-content__sum-value">
            {formatPct(summary.progressAvg, 0)}
          </span>
          <span className="crias-content__sum-note">
            {summary.releasedCount} de {summary.totalCount} conteúdos liberados
          </span>
        </div>
        <div className="crias-content__sum-item">
          <span className="crias-content__sum-label">
            <span className="crias-kpi__icon">
              <IconTarget />
            </span>
            Acerto médio
          </span>
          <span
            className="crias-content__sum-value"
            style={{
              color:
                summary.accuracyAvg != null && summary.accuracyAvg < 60
                  ? 'var(--c-rose-900)'
                  : undefined,
            }}
          >
            {formatPct(summary.accuracyAvg, 0)}
          </span>
          <span className="crias-content__sum-note">
            {summary.below60Count} exercícios abaixo de 60%
          </span>
        </div>
        <div className="crias-content__sum-item">
          <span className="crias-content__sum-label">
            <span className="crias-kpi__icon crias-kpi__icon--rose">
              <IconAlertLocal />
            </span>
            Exercício com menor acerto
          </span>
          <span
            className="crias-content__sum-value"
            style={{ color: 'var(--c-rose-900)' }}
          >
            {summary.lowest ? `${Math.round(summary.lowest.pct)}%` : '—'}
          </span>
          <span className="crias-content__sum-note">
            <strong>{summary.lowest?.label ?? ''}</strong>
            {summary.lowest?.note ? (
              <>
                <br />
                {summary.lowest.contentKey ? (
                  <button
                    type="button"
                    className="crias-content__sum-link"
                    onClick={() => onSelectKey(summary.lowest!.contentKey!)}
                  >
                    {summary.lowest.note}
                  </button>
                ) : (
                  summary.lowest.note
                )}
              </>
            ) : null}
          </span>
        </div>
        <div className="crias-content__sum-item">
          <span className="crias-content__sum-label">
            <span className="crias-kpi__icon crias-kpi__icon--green">
              <IconTrophyLocal />
            </span>
            Exercício com maior acerto
          </span>
          <span
            className="crias-content__sum-value"
            style={{ color: 'var(--c-green-800)' }}
          >
            {summary.highest ? `${Math.round(summary.highest.pct)}%` : '—'}
          </span>
          <span className="crias-content__sum-note">
            <strong>{summary.highest?.label ?? ''}</strong>
            {summary.highest?.note ? (
              <>
                <br />
                {summary.highest.contentKey ? (
                  <button
                    type="button"
                    className="crias-content__sum-link"
                    onClick={() => onSelectKey(summary.highest!.contentKey!)}
                  >
                    {summary.highest.note}
                  </button>
                ) : (
                  summary.highest.note
                )}
              </>
            ) : null}
          </span>
        </div>
      </div>

      <div
        className="crias-content__chart"
        onMouseLeave={() => setHoverKey(null)}
      >
        <div className="crias-content__legend">
          <span>
            <i style={{ background: 'var(--c-green)' }} /> Concluíram
          </span>
          <span>
            <i style={{ background: 'var(--c-text)' }} /> Acerto
          </span>
          <span className="crias-content__legend-muted">
            <i className="crias-content__dash" /> 60% de acerto
          </span>
          <span className="crias-content__legend-hint">
            Passe o cursor para ver o nome · clique para ver os exercícios
          </span>
        </div>

        <div className="crias-content__scroll">
          <div
            className="crias-content__plot"
            style={{ width: Math.max(plotWidth + 48, 480) }}
          >
            <div className="crias-content__yaxis" aria-hidden="true">
              <span data-y="100">100%</span>
              <span data-y="60">60%</span>
              <span data-y="50">50%</span>
              <span data-y="0">0</span>
            </div>

            <div className="crias-content__plot-main">
              <div className="crias-content__gridline" data-y="100" />
              <div className="crias-content__gridline" data-y="50" />
              <div className="crias-content__gridline crias-content__gridline--60" data-y="60" />

              <div
                className="crias-content__bars"
                style={{
                  gridTemplateColumns: `repeat(${bars.length}, ${colW}px)`,
                }}
              >
                {bars.map((bar) => {
                  const open = selectedKey === bar.key
                  const ch = bar.released ? Math.max(0, bar.completionPct ?? 0) : 0
                  const ah = bar.released ? Math.max(0, bar.accuracyPct ?? 0) : 0
                  const low =
                    bar.accuracyPct != null && bar.accuracyPct < 60
                  return (
                    <button
                      key={bar.key}
                      type="button"
                      className={[
                        'crias-content__col',
                        open ? 'crias-content__col--open' : '',
                        !bar.released ? 'crias-content__col--future' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      disabled={!bar.released}
                      aria-pressed={open}
                      aria-label={
                        bar.released
                          ? `Conteúdo ${bar.num}, ${bar.title}: ${formatPct(bar.completionPct, 0)} concluíram, ${formatPct(bar.accuracyPct, 0)} de acerto`
                          : `Conteúdo ${bar.num}, ${bar.title}: ainda não liberado`
                      }
                      onMouseEnter={() => setHoverKey(bar.key)}
                      onFocus={() => setHoverKey(bar.key)}
                      onClick={() =>
                        onSelectKey(
                          open || !bar.released ? null : bar.key,
                        )
                      }
                    >
                      {bar.released ? (
                        <>
                          <span
                            className="crias-content__bar crias-content__bar--comp"
                            style={{ height: `${Math.min(100, ch)}%` }}
                          />
                          <span
                            className="crias-content__bar crias-content__bar--acc"
                            style={{
                              height: `${Math.min(100, ah)}%`,
                              background: low ? '#d9546b' : 'var(--c-text)',
                            }}
                          />
                        </>
                      ) : null}
                    </button>
                  )
                })}
              </div>

              {tip ? (
                <div
                  className="crias-content__tooltip"
                  style={{
                    left: `${((bars.findIndex((b) => b.key === tip.key) + 0.5) / bars.length) * 100}%`,
                  }}
                >
                  <span className="crias-content__tooltip-kicker">
                    Conteúdo {tip.num}
                  </span>
                  <strong>{tip.title}</strong>
                  {tip.released ? (
                    <span className="crias-content__tooltip-grid">
                      <span>
                        <span className="muted">Concluíram</span>
                        <strong>{formatPct(tip.completionPct, 0)}</strong>
                        <span className="muted">
                          {tip.completedCount.toLocaleString('pt-BR')} alunos
                        </span>
                      </span>
                      <span>
                        <span className="muted">Acerto</span>
                        <strong
                          style={{
                            color:
                              tip.accuracyPct != null && tip.accuracyPct < 60
                                ? '#ff9fb0'
                                : undefined,
                          }}
                        >
                          {formatPct(tip.accuracyPct, 0)}
                        </strong>
                        <span className="muted">
                          {tip.subtitle ?? 'exercícios'}
                        </span>
                      </span>
                    </span>
                  ) : (
                    <span className="muted">ainda não liberado</span>
                  )}
                </div>
              ) : null}
            </div>

            <span className="crias-content__xaxis-label">CONT.</span>
            <div
              className="crias-content__nums"
              style={{
                gridTemplateColumns: `repeat(${bars.length}, ${colW}px)`,
              }}
            >
              {bars.map((bar) => (
                <span
                  key={bar.key}
                  className={
                    selectedKey === bar.key
                      ? 'crias-content__num crias-content__num--on'
                      : 'crias-content__num'
                  }
                >
                  {bar.num}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selected ? (
        <div className="crias-content__detail">
          <div className="crias-content__detail-head">
            <span className="crias-content__detail-tag">
              Conteúdo {selected.num}
            </span>
            <strong>{selected.title}</strong>
            <span className="crias-content__detail-meta">
              {formatPct(selected.completionPct, 0)} concluíram ·{' '}
              {formatPct(selected.accuracyPct, 0)} de acerto
            </span>
          </div>

          {selected.exercises.length === 0 ? (
            <p className="muted" style={{ marginTop: 16 }}>
              Nenhum tópico de exercício nesta aula.
            </p>
          ) : (
            <ul className="crias-content__ex-list">
              {selected.exercises.map((ex) => {
                const low =
                  ex.accuracyPct != null && ex.accuracyPct < 60
                return (
                  <li key={ex.key} className="crias-content__ex">
                    <span className="crias-content__ex-body">
                      <span className="crias-content__ex-tag">{ex.label}</span>
                      <span className="crias-content__ex-q">{ex.prompt}</span>
                    </span>
                    <span className="crias-content__ex-acc">
                      <strong
                        style={{
                          color: low ? 'var(--c-rose-900)' : undefined,
                        }}
                      >
                        {ex.accuracyPct == null
                          ? '—'
                          : `${ex.accuracyPct}%`}
                      </strong>
                      <span>{ex.note}</span>
                    </span>
                    {ex.href ? (
                      <a href={ex.href} className="btn btn--ghost btn--small">
                        Ver exercício
                      </a>
                    ) : (
                      <span className="btn btn--ghost btn--small" aria-hidden>
                        Ver exercício
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          {selected.trailHref ? (
            <a
              href={selected.trailHref}
              className="btn btn--primary"
              style={{ marginTop: 16 }}
            >
              Abrir conteúdo na trilha →
            </a>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
