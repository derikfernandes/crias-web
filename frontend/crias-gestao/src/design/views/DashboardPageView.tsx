import { useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import type {
  DashboardPageViewProps,
  DashboardPillRowView,
  DashboardStudentRowView,
  DashboardStudentSortKey,
} from '../types/dashboardPageView'
import {
  Banner,
  BootSymbol,
  FilterPopover,
  Icon,
  na,
  PageHead,
  ScrollX,
} from '../gx/ui'

export type { DashboardPageViewProps } from '../types/dashboardPageView'

function pctText(v: number | null | undefined): string {
  if (v === null || v === undefined) return 'N/A'
  return `${String(v).replace('.', ',')} %`
}

/** % de acerto sem tentativas: estado vazio documentado (sem travessão). */
function accuracyCellText(v: number | null | undefined): string {
  if (v === null || v === undefined) return 'sem exercícios'
  return pctText(v)
}

function accuracySummaryText(
  value: number | null | undefined,
  loading?: boolean,
): string {
  if (loading) return 'Carregando…'
  return pctText(value)
}

function accuracyPill(p: number): string {
  if (p >= 70) return 'gx-pill gx-pill--ok'
  if (p >= 50) return 'gx-pill gx-pill--warn'
  return 'gx-pill gx-pill--err'
}

function accuracyBar(p: number): string {
  if (p >= 70) return 'gx-bar gx-bar--green'
  if (p >= 50) return 'gx-bar'
  return 'gx-bar gx-bar--red'
}

function BarRow({
  label,
  count,
  max,
  labelWidth = 110,
  enrolledCount,
}: {
  label: string
  count: number
  max: number
  labelWidth?: number
  /** Se 0, tooltip vira "sem alunos". */
  enrolledCount?: number
}) {
  const tip =
    enrolledCount === 0
      ? `${label}: sem alunos`
      : `${label}: ${count}${enrolledCount != null ? ` de ${enrolledCount}` : ''}`
  const pctWidth = count > 0 && max > 0 ? (count / max) * 100 : 0
  return (
    <div
      className="gx-chart-row"
      style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}
      title={tip}
    >
      <span
        style={{
          width: labelWidth,
          color: 'var(--v-t3)',
          flex: 'none',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
      </span>
      <span className="gx-bar" style={{ flex: 1, height: 10 }} aria-label={tip} title={tip}>
        {pctWidth > 0 ? (
          <span style={{ width: `${pctWidth}%` }} />
        ) : (
          <span className="gx-bar__empty" />
        )}
      </span>
      <strong style={{ width: 36, textAlign: 'right', flex: 'none' }}>{count}</strong>
    </div>
  )
}

/** Exercício com enunciado, alternativas, contagem de respostas e gabarito (1.1.3). */
function Opportunity({
  row,
  open,
  onToggle,
}: {
  row: DashboardPillRowView
  open: boolean
  onToggle: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button
        type="button"
        aria-expanded={open}
        title="Ver enunciado"
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          border: 0,
          background: 'transparent',
          padding: 0,
          font: 'inherit',
          fontSize: 14,
          color: 'var(--v-ink)',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span data-fade="1" style={{ flex: 1, minWidth: 0 }}>
          <strong>{row.trailName}</strong> · Atividade {row.questionNumber} · {row.exerciseLabel}
        </span>
        <span className={accuracyPill(row.accuracyPct)}>{row.accuracyPct}%</span>
        <RoundArrow open={open} />
      </button>
      <span className={accuracyBar(row.accuracyPct)} style={{ height: 4 }}>
        <span style={{ width: `${row.accuracyPct}%` }} />
      </span>
      {open ? <QuestionDetail row={row} /> : null}
    </div>
  )
}

function QuestionDetail({ row }: { row: DashboardPillRowView }) {
  const max = Math.max(1, ...row.alternatives.map((a) => a.count))
  return (
    <div
      style={{
        background: 'var(--v-soft)',
        borderRadius: 14,
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--v-t3)', letterSpacing: '.04em', textTransform: 'uppercase' }}>
          Enunciado
        </span>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: 'var(--v-ink)', whiteSpace: 'pre-wrap' }}>
          {row.statement || 'N/A'}
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {row.alternatives.map((a) => (
          <div key={a.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
              <span
                className={a.correct ? 'gx-pill gx-pill--ok' : 'gx-pill'}
                style={{ minWidth: 28, textAlign: 'center' }}
              >
                {a.key}
              </span>
              <span data-fade="1" style={{ flex: 1, minWidth: 0, color: 'var(--v-ink)' }}>
                {a.text || 'N/A'}
              </span>
              <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{a.count}</strong>
            </div>
            <span className={a.correct ? 'gx-bar gx-bar--green' : 'gx-bar'} style={{ height: 4 }}>
              <span style={{ width: `${(a.count / max) * 100}%` }} />
            </span>
          </div>
        ))}
        {row.alternatives.length === 0 ? <span className="gx-muted">Alternativas indisponíveis.</span> : null}
      </div>
      <p
        className="gx-muted"
        style={{ lineHeight: 1.5, borderTop: '1px solid var(--v-soft2)', paddingTop: 12, fontSize: 13 }}
      >
        Gabarito: <strong>{row.gabarito || 'N/A'}</strong> · {row.total} respostas · {row.correct} acertos ·{' '}
        {row.wrong} erros
      </p>
    </div>
  )
}

function SortTh({
  label,
  sortKey,
  current,
  indicator,
  onSort,
  numeric,
}: {
  label: string
  sortKey: DashboardStudentSortKey
  current: string
  indicator: string
  onSort: (k: DashboardStudentSortKey) => void
  numeric?: boolean
}) {
  return (
    <th className={numeric ? 'num' : undefined} aria-sort={indicator.trim() ? 'ascending' : 'none'}>
      <button type="button" className="gx-sort" data-dir={indicator.includes('↑') ? 'asc' : indicator.includes('↓') ? 'desc' : undefined} onClick={() => onSort(sortKey)}>
        {label}
        <svg width="10" height="14" viewBox="0 0 10 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 5l3-3 3 3" />
          <path d="M2 9l3 3 3-3" />
        </svg>
      </button>
      <span hidden>{current}</span>
    </th>
  )
}

const PIE_COLORS: Record<string, string> = { completed: '#00be85', inProgress: '#f9d84a', notStarted: '#e6e2d2' }

/** Pizza simples da Situação dos alunos (1.1.1.b, F). */
function Pie({ items }: { items: Array<{ key: string; count: number }> }) {
  const total = items.reduce((n, i) => n + i.count, 0)
  const r = 80
  let acc = 0
  if (total <= 0) {
    return (
      <svg viewBox="0 0 200 200" width="100%" style={{ maxWidth: 220 }} role="img" aria-label="Situação dos alunos">
        <circle cx="100" cy="100" r={r} fill="var(--v-soft2)" />
      </svg>
    )
  }
  const point = (frac: number) => {
    const ang = frac * 2 * Math.PI - Math.PI / 2
    return [100 + r * Math.cos(ang), 100 + r * Math.sin(ang)] as const
  }
  return (
    <svg viewBox="0 0 200 200" width="100%" style={{ maxWidth: 220 }} role="img" aria-label="Situação dos alunos">
      {items
        .filter((i) => i.count > 0)
        .map((i) => {
          const start = acc / total
          acc += i.count
          const end = acc / total
          if (i.count === total) return <circle key={i.key} cx="100" cy="100" r={r} fill={PIE_COLORS[i.key] ?? '#ccc'} />
          const [x1, y1] = point(start)
          const [x2, y2] = point(end)
          const large = end - start > 0.5 ? 1 : 0
          return <path key={i.key} d={`M100 100 L${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`} fill={PIE_COLORS[i.key] ?? '#ccc'} />
        })}
    </svg>
  )
}

function RoundArrow({ open }: { open: boolean }) {
  return (
    <span className="gx-roundarrow gx-roundarrow--sm" aria-hidden="true">
      <Icon name={open ? 'chev-up' : 'chev-down'} size={14} />
    </span>
  )
}

/** Dados (1.1.1.b, F): filtros fixos, resumo, quatro cartões que não mudam com as abas, Desempenho e a tabela. */
export function DashboardPageView(p: DashboardPageViewProps) {
  const [openOpp, setOpenOpp] = useState<string | null>(null)
  const [openEx, setOpenEx] = useState<string | null>(null)
  const periods: Array<[0 | 7 | 30, string]> = [
    [7, '7 dias'],
    [30, '30 dias'],
    [0, 'Tudo'],
  ]
  const trailSel = useMemo(() => new Set(p.trailFilterSelectedIds), [p.trailFilterSelectedIds])
  const questionSel = useMemo(() => new Set(p.questionPickerSelectedIds), [p.questionPickerSelectedIds])
  const stageSel = useMemo(() => new Set(p.stagePickerSelectedIds), [p.stagePickerSelectedIds])
  const columnSel = useMemo(() => new Set(p.columnPickerSelectedIds), [p.columnPickerSelectedIds])

  if (p.loadingInst || p.isDashboardLoading) return <BootSymbol />

  const refreshing = Boolean(p.isDashboardRefreshing)
  const charts = p.studentsCharts
  const chartsLoading = Boolean(charts.loading)
  const bucketMax = Math.max(0, ...charts.completionBuckets.map((b) => b.count))
  const lessonMax = Math.max(1, ...charts.lessonBars.map((b) => b.count))
  const agent = p.agentUsage
  const statusTotal = charts.statuses.reduce((n, b) => n + b.count, 0)
  const msgsDayHint =
    p.agentPeriodDays === 0
      ? 'Média no intervalo entre a primeira e a última mensagem do histórico (dias de calendário).'
      : `Média dividida por ${p.agentPeriodDays} dias do período selecionado.`
  const errors = [p.instError, p.dataError, p.exportError].filter(Boolean) as string[]
  const monitorKpis = [
    { label: 'Mensagens', value: String(agent.totalMessages) },
    { label: 'Alunos', value: String(agent.uniqueStudents) },
    { label: 'Cobertura', value: pctText(agent.coveragePct) },
    { label: 'Por dia', value: String(agent.msgsPerTutorPerDay).replace('.', ','), hint: msgsDayHint },
  ]
  const lo = Math.min(p.pctMin, p.pctMax)
  const hi = Math.max(p.pctMin, p.pctMax)

  return (
    <div className="gx-page">
      <PageHead
        title="Dados"
        subtitle="Informações sobre o progresso dos alunos"
        actions={
          <>
            {p.metricsUpdatedAtLabel ? (
              <span className="gx-muted" style={{ fontSize: 13, fontWeight: 600 }}>
                {p.metricsUpdatedAtLabel}
              </span>
            ) : null}
            {p.onForceRefreshMetrics ? (
              <button
                type="button"
                className="gx-btn gx-btn--outline"
                onClick={p.onForceRefreshMetrics}
                disabled={Boolean(p.metricsForceRefreshing)}
                aria-busy={p.metricsForceRefreshing || undefined}
                title="Recalcular métricas no servidor"
              >
                <Icon name="refresh" size={14} />
                {p.metricsForceRefreshing ? 'Atualizando…' : 'Atualizar'}
              </button>
            ) : null}
          </>
        }
        tools={
          // 1.3.9: Filtrar matéria, Filtrar turma, Filtrar trilhas, nessa ordem. A pesquisa de aluno foi para a aba Alunos.
          <div className="gx-filters" role="group" aria-label="Filtros">
            <span className="gx-filters__label">Filtros</span>
            <div className="gx-filters__item">
              <FilterPopover
                variant="field"
                align="left"
                label="Filtrar matéria"
                options={p.materiaFilterOptions.map((x) => ({ id: x, name: x }))}
                selected={p.materiaFilterSelected}
                onChange={p.onMateriaFilterChange}
                emptyText="Nenhuma matéria encontrada."
              />
            </div>
            <div className="gx-filters__item">
              <FilterPopover
                variant="field"
                align="left"
                label="Filtrar turma"
                options={p.turmaFilterOptions.map((x) => ({ id: x, name: x }))}
                selected={p.turmaFilterSelected}
                onChange={p.onTurmaFilterChange}
                emptyText="Nenhuma turma encontrada."
              />
            </div>
            <div className="gx-filters__item">
              <FilterPopover
                variant="field"
                align="left"
                label="Filtrar trilhas"
                options={p.trailFilterOptions.map((o) => ({ id: o.id, name: o.label }))}
                selected={trailSel}
                onChange={p.onTrailFilterChange}
                emptyText="Nenhuma trilha encontrada."
              />
            </div>
          </div>
        }
      />
      {errors.map((e) => (
        <Banner key={e}>{e}</Banner>
      ))}
      {p.logsError ? <Banner onRetry={p.onRetryLogs}>{p.logsError}</Banner> : null}
      {refreshing ? (
        <p className="gx-refresh-hint" role="status" aria-live="polite">
          Atualizando…
        </p>
      ) : null}

      <div className={refreshing ? 'gx-stats gx-stats--5 is-refreshing' : 'gx-stats gx-stats--5'} aria-label="Resumo" aria-busy={refreshing || undefined}>
        <div className="gx-stat">
          <span>Alunos ativos</span>
          <strong>{p.summary.countsLoading ? 'Carregando…' : p.summary.activeStudents}</strong>
          {p.summary.inactiveStudents !== undefined && !p.summary.countsLoading ? (
            <span className="gx-muted" style={{ fontSize: 12 }}>
              {p.summary.inactiveStudents} inativos
            </span>
          ) : null}
        </div>
        <div className="gx-stat">
          <span>Trilhas ativas</span>
          <strong>{p.summary.countsLoading ? 'Carregando…' : p.summary.activeTrails}</strong>
        </div>
        <div className="gx-stat">
          <span title="% de atividades concluídas">Conclusão média</span>
          <strong>{p.summary.completionLoading ? 'Carregando…' : pctText(p.summary.avgCompletion)}</strong>
          <span className="gx-bar" style={{ marginTop: 6 }} aria-hidden="true">
            {p.summary.completionLoading || p.summary.avgCompletion === null ? <span className="gx-bar__empty" /> : <span style={{ width: `${p.summary.avgCompletion}%` }} />}
          </span>
        </div>
        <div className="gx-stat">
          <span>Acerto médio</span>
          <strong>
            {p.logsError && !p.summary.avgAccuracyLoading ? 'Erro' : accuracySummaryText(p.summary.avgAccuracy, p.summary.avgAccuracyLoading)}
          </strong>
          {p.logsError && !p.summary.avgAccuracyLoading ? (
            <button type="button" className="gx-linkbtn" style={{ marginTop: 6, fontSize: 12 }} onClick={p.onRetryLogs}>
              Tentar de novo
            </button>
          ) : (
            <span className="gx-bar gx-bar--green" style={{ marginTop: 6 }} aria-hidden="true">
              {p.summary.avgAccuracyLoading || p.summary.avgAccuracy === null ? <span className="gx-bar__empty" /> : <span style={{ width: `${p.summary.avgAccuracy}%` }} />}
            </span>
          )}
          {!p.summary.avgAccuracyLoading && !p.logsError && p.summary.avgAccuracy === null ? (
            <span className="gx-muted" style={{ fontSize: 12 }}>
              sem exercícios
            </span>
          ) : null}
        </div>
        <div className="gx-stat">
          <span>Perguntas ao monitor</span>
          <strong>{p.agentUsageLoading ? 'Carregando…' : String(agent.msgsPerTutorPerDay).replace('.', ',')}</strong>
          {!p.agentUsageLoading ? (
            <span className="gx-muted" style={{ fontSize: 12 }}>
              {agent.totalMessages} totais
            </span>
          ) : null}
        </div>
      </div>

      <div className="gx-dadoscols">
        <section className="gx-card" aria-busy={chartsLoading || undefined}>
          <h2 style={{ fontSize: 16 }}>Conclusão das atividades</h2>
          {chartsLoading ? (
            <p className="gx-muted">Carregando…</p>
          ) : (
            charts.completionBuckets.map((b) => <BarRow key={b.key} label={b.label} count={b.count} max={bucketMax} />)
          )}
          <div className="gx-rangefilter">
            <p className="gx-rangefilter__label">
              <span>Filtro por % de conclusão</span>
              <span aria-hidden="true" />
            </p>
            <label>
              <span>De</span>
              <input type="range" min={0} max={100} step={5} value={lo} aria-label="De (% de conclusão)" onChange={(e) => p.onPctMinChange(Number(e.target.value))} />
              <strong>{lo}%</strong>
            </label>
            <label>
              <span>Até</span>
              <input type="range" min={0} max={100} step={5} value={hi} aria-label="Até (% de conclusão)" onChange={(e) => p.onPctMaxChange(Number(e.target.value))} />
              <strong>{hi}%</strong>
            </label>
          </div>
        </section>

        <section className="gx-card" aria-busy={chartsLoading || undefined}>
          <h2 style={{ fontSize: 16 }}>Situação dos alunos</h2>
          {chartsLoading ? (
            <p className="gx-muted">Carregando…</p>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Pie items={charts.statuses} />
              </div>
              <div className="gx-legend">
                {charts.statuses.map((b) => (
                  <div key={b.key} className="gx-legend__row">
                    <span className="gx-legend__dot" style={{ background: PIE_COLORS[b.key] ?? '#ccc' }} />
                    <span style={{ flex: 1 }}>{b.key === 'completed' ? 'Concluiu' : b.label}</span>
                    <strong>{b.count}</strong>
                    <span className="gx-muted" style={{ width: 52, textAlign: 'right' }}>
                      {statusTotal > 0 ? `${Math.round((b.count / statusTotal) * 100)} %` : 'N/A'}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="gx-card" aria-label="Uso do monitor" key={`monitor-${p.selectedId || 'multi'}-${p.agentPeriodDays}`}>
          <h2 style={{ fontSize: 19 }}>Uso do monitor</h2>
          <div className="gx-seg" role="tablist" aria-label="Período">
            {periods.map(([days, label]) => (
              <button
                key={days}
                type="button"
                role="tab"
                className="gx-tab"
                aria-selected={p.agentPeriodDays === days}
                onClick={() => p.onAgentPeriodDaysChange(days)}
                disabled={Boolean(p.logsError) && !p.agentUsageLoading}
              >
                {label}
              </button>
            ))}
          </div>
          {p.logsError ? (
            <p className="gx-muted" role="alert">
              Erro: {p.logsError}
            </p>
          ) : p.agentUsageUnavailable ? (
            <p className="gx-muted">Dados de uso indisponíveis neste momento.</p>
          ) : (
            <div className="gx-minitiles">
              {monitorKpis.map((k) => (
                <div className="gx-stat" key={k.label} title={'hint' in k ? k.hint : undefined}>
                  <span>{k.label}</span>
                  <strong>{p.agentUsageLoading ? 'Carregando…' : k.value}</strong>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="gx-card gx-card--chart" aria-busy={chartsLoading || undefined}>
        <h2 style={{ fontSize: 16 }}>Alunos por atividade concluída</h2>
        {chartsLoading ? (
          <p className="gx-muted">Carregando…</p>
        ) : (
          <div className="gx-lesson-chart" role="img" aria-label="Alunos por atividade concluída">
            <div className="gx-lesson-chart__track" style={{ ['--gx-lesson-cols']: String(Math.max(1, charts.lessonBars.length)) } as CSSProperties}>
              {charts.lessonBars.map((b) => {
                const tip =
                  b.enrolledCount === 0 ? `${b.fullLabel ?? b.label}: sem alunos` : `${b.fullLabel ?? b.label}: ${b.count} de ${b.enrolledCount}`
                const barH = b.count > 0 && lessonMax > 0 ? Math.max(8, (b.count / lessonMax) * 80) : 0
                const shortLabel = b.label.trim() || 'E?'
                return (
                  <div key={b.key} className="gx-lesson-chart__col" tabIndex={0} aria-label={tip}>
                    <span className="gx-lesson-chart__tip" role="tooltip">
                      {tip}
                    </span>
                    <strong className="gx-lesson-chart__n">{b.count}</strong>
                    <span
                      className="gx-lesson-chart__bar"
                      style={{ height: barH > 0 ? `${barH}%` : 4, minHeight: 4, background: barH > 0 ? undefined : 'transparent', opacity: barH > 0 ? 1 : 0.35 }}
                    />
                    <span className="gx-lesson-chart__label">{shortLabel}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>

      <section className="gx-card" aria-label="Desempenho" style={{ padding: 24, gap: 24 }}>
        <div>
          <h2>Desempenho</h2>
          <p className="gx-muted">
            {p.logsError ? 'Não foi possível carregar o desempenho.' : 'Clique em um exercício para ver o enunciado'}
          </p>
        </div>
        {p.logsError ? (
          <p className="gx-muted" role="alert">
            Erro: {p.logsError}
          </p>
        ) : (
          <div className="gx-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 32 }}>
            {(
              [
                ['Menor acerto', p.worstPills],
                ['Maior acerto', p.bestPills],
              ] as const
            ).map(([title, list]) => (
              <div key={title} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <h3 style={{ fontSize: 15, color: 'var(--v-t2)' }}>{title}</h3>
                {p.exercisesLoading ? (
                  <p className="gx-muted">Carregando…</p>
                ) : (
                  <>
                    {list.map((row) => (
                      <Opportunity
                        key={`${title}-${row.key}`}
                        row={row}
                        open={openOpp === `${title}-${row.key}`}
                        onToggle={() => setOpenOpp((c) => (c === `${title}-${row.key}` ? null : `${title}-${row.key}`))}
                      />
                    ))}
                    {list.length === 0 ? <p className="gx-muted">N/A</p> : null}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="gx-card" aria-label="Alunos e exercícios" style={{ padding: 0, gap: 0, overflow: 'visible' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '24px 24px 20px' }}>
          <nav role="tablist" aria-label="Dados" className="gx-tabs" style={{ marginTop: 0 }}>
            <button role="tab" type="button" className="gx-tab" aria-selected={p.activeTab === 'students'} onClick={() => p.onActiveTabChange('students')}>
              Alunos <span className="gx-muted">({p.studentsCountLoading ? '…' : p.totalStudentCount})</span>
            </button>
            <button role="tab" type="button" className="gx-tab" aria-selected={p.activeTab === 'questions'} onClick={() => p.onActiveTabChange('questions')}>
              Exercícios <span className="gx-muted">({p.exercisesLoading ? '…' : p.totalPillCount})</span>
            </button>
          </nav>
          {p.activeTab === 'students' ? (
            // 1.3.9: a pesquisa filtra só a tabela desta aba (os números do painel seguem os filtros do topo).
            <label className="gx-search" style={{ maxWidth: 480 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                type="search"
                aria-label="Pesquisar nome ou telefone do aluno"
                placeholder="Pesquisar nome ou telefone do aluno"
                value={p.nameFilter}
                onChange={(e) => p.onNameFilterChange(e.target.value)}
              />
            </label>
          ) : null}
          {p.activeTab === 'students' ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              <div className="gx-filters__item">
                <FilterPopover
                  variant="field"
                  align="left"
                  label="Atividades"
                  options={p.questionPickerItems.map((o) => ({ id: o.id, name: o.label }))}
                  selected={questionSel}
                  onChange={p.onApplyQuestionPicker}
                  emptyText="Nenhuma atividade."
                />
              </div>
              <div className="gx-filters__item">
                <FilterPopover
                  variant="field"
                  align="left"
                  label="Etapas"
                  options={p.stagePickerItems.map((o) => ({ id: o.id, name: o.label }))}
                  selected={stageSel}
                  onChange={p.onApplyStagePicker}
                  emptyText="Nenhuma etapa."
                />
              </div>
              <div className="gx-filters__item">
                <FilterPopover
                  variant="field"
                  align="left"
                  label="Colunas"
                  options={p.columnPickerItems.map((o) => ({ id: o.id, name: o.label }))}
                  selected={columnSel}
                  onChange={p.onApplyColumnPicker}
                  emptyText="Nenhuma coluna."
                />
              </div>
              {p.studentExportTrails.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, width: '100%' }}>
                  {p.studentExportTrails.map((t) => (
                    <button key={t.id} type="button" className="gx-btn" disabled={p.exportingTrailId === t.id} onClick={() => p.onExportTrailHistory(t.id)}>
                      {p.exportingTrailId === t.id ? 'Exportando…' : `Exportar histórico: ${t.label}`}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span className="gx-muted">Clique em qualquer ponto da linha para abrir o enunciado</span>
              <button type="button" className="gx-btn gx-btn--primary" onClick={p.onExportExerciseHistory}>
                Exportar histórico
              </button>
            </div>
          )}
        </div>

        {p.activeTab === 'students' ? (
          <>
            <ScrollX>
              <table className="gx-table">
                <thead>
                  <tr>
                    <SortTh label="Nome" sortKey="name" current="" indicator={p.nameSortIndicator} onSort={p.onToggleStudentSort} />
                    {p.visibleColumns.map((c) => (
                      <SortTh key={c.key} label={LABELS[c.key] ?? c.label} sortKey={c.key} current="" indicator={c.sortIndicator} onSort={p.onToggleStudentSort} numeric={c.key !== 'phone' && c.key !== 'turma'} />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {p.paginatedStudentRows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link to={r.href} style={{ color: 'var(--v-ink)', fontWeight: 700 }}>
                          {r.name || r.id}
                        </Link>
                      </td>
                      {p.visibleColumns.map((c) => (
                        <StudentCell key={c.key} col={c.key} row={r} />
                      ))}
                    </tr>
                  ))}
                  {p.studentRowsEmpty ? (
                    <tr>
                      <td colSpan={p.visibleColumns.length + 1} className="gx-table__empty">
                        {p.studentsCountLoading ? 'Carregando…' : 'Nenhum aluno com os filtros atuais.'}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </ScrollX>
            {p.showStudentPagination ? (
              <div className="gx-pager" style={{ padding: '12px 20px', borderTop: '1px solid var(--v-soft2)' }}>
                <span>
                  {p.studentPageRange.start} a {p.studentPageRange.end} de {p.sortedFilteredStudentCount}
                </span>
                <div className="gx-pager__ctl">
                  <button type="button" className="gx-btn gx-btn--sm" disabled={p.studentPage <= 1} onClick={p.onStudentPagePrev}>
                    Anterior
                  </button>
                  <button type="button" className="gx-btn gx-btn--sm" disabled={p.studentPage >= p.studentPageCount} onClick={p.onStudentPageNext}>
                    Próxima
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <ScrollX>
              <table className="gx-table">
                <thead>
                  <tr>
                    <th>Trilha</th>
                    <th className="num">Atividade</th>
                    <th>Título</th>
                    <th className="num">% de acerto</th>
                    <th className="num">Respostas</th>
                    <th className="num">Acertos</th>
                    <th className="num">Erros</th>
                    <th>Gabarito</th>
                  </tr>
                </thead>
                <tbody>
                  {p.paginatedPillRows.map((r) => (
                    <PillTableRows key={r.key} row={r} open={openEx === r.key} onToggle={() => setOpenEx((c) => (c === r.key ? null : r.key))} />
                  ))}
                  {p.paginatedPillRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="gx-table__empty">
                        {p.isQuestionsTabLoading ? 'Carregando…' : 'Nenhum exercício com os filtros atuais.'}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </ScrollX>
            {p.showPillPagination ? (
              <div className="gx-pager" style={{ padding: '12px 20px', borderTop: '1px solid var(--v-soft2)' }}>
                <span>
                  {p.pillPageRange.start} a {p.pillPageRange.end} de {p.sortedPillCount}
                </span>
                <div className="gx-pager__ctl">
                  <button type="button" className="gx-btn gx-btn--sm" disabled={p.pillPage <= 1} onClick={p.onPillPagePrev}>
                    Anterior
                  </button>
                  <button type="button" className="gx-btn gx-btn--sm" disabled={p.pillPage >= p.pillPageCount} onClick={p.onPillPageNext}>
                    Próxima
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  )
}

function StudentCell({ col, row }: { col: string; row: DashboardStudentRowView }) {
  switch (col) {
    case 'turma':
      return <td>{na(row.turma)}</td>
    case 'phone':
      return <td>{na(row.phone)}</td>
    case 'released':
      return <td className="num">{row.released}</td>
    case 'done':
      return <td className="num">{row.done}</td>
    case 'completionPct':
    case 'lessonsCompletionPct': {
      const v = col === 'completionPct' ? row.completionPct : row.lessonsCompletionPct
      return (
        <td className="num">
          <strong>{pctText(v)}</strong>
          {v !== null ? (
            <span className="gx-bar" style={{ marginTop: 4 }}>
              <span style={{ width: `${v}%` }} />
            </span>
          ) : null}
        </td>
      )
    }
    case 'lessonsReleased':
      return <td className="num">{row.lessonsReleased}</td>
    case 'lessonsDone':
      return <td className="num">{row.lessonsDone}</td>
    case 'correct':
      return <td className="num">{row.correct}</td>
    case 'wrong':
      return <td className="num">{row.wrong}</td>
    case 'accuracyPct':
      return (
        <td className="num">
          <strong>{accuracyCellText(row.accuracyPct)}</strong>
          {row.accuracyPct !== null ? (
            <span className="gx-bar" style={{ marginTop: 4 }}>
              <span style={{ width: `${row.accuracyPct}%` }} />
            </span>
          ) : null}
        </td>
      )
    default:
      return <td />
  }
}

const LABELS: Record<string, string> = {
  turma: 'Turma',
  phone: 'Telefone',
  lessonsReleased: 'Atividades liberadas',
  lessonsDone: 'Atividades feitas',
  lessonsCompletionPct: '% conclusão (atividades)',
  released: 'Etapas liberadas',
  done: 'Etapas feitas',
  completionPct: '% conclusão (etapas)',
  correct: 'Acertos',
  wrong: 'Erros',
  accuracyPct: '% de acerto',
}

function PillTableRows({
  row,
  open,
  onToggle,
}: {
  row: DashboardPillRowView
  open: boolean
  onToggle: () => void
}) {
  return (
    <>
      <tr className="gx-row--click" onClick={onToggle} aria-expanded={open}>
        <td>
          <strong>{row.trailName}</strong>
        </td>
        <td className="num">{row.questionNumber}</td>
        <td>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
            {row.exerciseLabel}
            <RoundArrow open={open} />
          </span>
        </td>
        <td className="num">
          <span className={accuracyPill(row.accuracyPct)}>{row.accuracyPct}%</span>
        </td>
        <td className="num">{row.total}</td>
        <td className="num">{row.correct}</td>
        <td className="num">{row.wrong}</td>
        <td>{row.gabarito || 'N/A'}</td>
      </tr>
      {open ? (
        <tr>
          <td colSpan={8} style={{ padding: 16, background: 'var(--v-soft)' }}>
            <QuestionDetail row={row} />
          </td>
        </tr>
      ) : null}
    </>
  )
}
