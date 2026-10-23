import { useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import type {
  DashboardPageViewProps,
  DashboardPillRowView,
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
        <span style={{ transform: open ? 'rotate(180deg)' : 'none', display: 'inline-flex' }}>
          <Icon name="chev-down" />
        </span>
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

/** Dados (1.1.12, 1.1.13 e 1.1.3): resumo, gráficos, uso do monitor, oportunidades e tabelas. */
export function DashboardPageView(p: DashboardPageViewProps) {
  const [openOpp, setOpenOpp] = useState<string | null>(null)
  const [openEx, setOpenEx] = useState<string | null>(null)
  const periods: Array<[0 | 7 | 30, string]> = [
    [7, '7 dias'],
    [30, '30 dias'],
    [0, 'Todo o período'],
  ]
  const trailSel = useMemo(() => new Set(p.trailFilterSelectedIds), [p.trailFilterSelectedIds])
  const studentSel = useMemo(() => new Set(p.studentFilterSelectedIds), [p.studentFilterSelectedIds])

  if (p.loadingInst || p.isDashboardLoading) return <BootSymbol />

  const charts = p.studentsCharts
  const bucketMax = Math.max(0, ...charts.completionBuckets.map((b) => b.count))
  const statusMax = Math.max(0, ...charts.statuses.map((b) => b.count))
  const lessonMax = Math.max(1, ...charts.lessonBars.map((b) => b.count))
  const agent = p.agentUsage
  const msgsDayHint =
    p.agentPeriodDays === 0
      ? 'Média no intervalo entre a primeira e a última mensagem do histórico (dias de calendário).'
      : `Média dividida por ${p.agentPeriodDays} dias do período selecionado.`
  const agentKpis = [
    { label: 'Perguntas ao monitor', value: String(agent.totalMessages) },
    { label: 'Alunos que usaram', value: String(agent.uniqueStudents) },
    { label: 'Cobertura', value: pctText(agent.coveragePct) },
    {
      label: 'Mensagens por dia',
      value: String(agent.msgsPerTutorPerDay).replace('.', ','),
      hint: msgsDayHint,
    },
  ]
  const errors = [p.instError, p.dataError, p.exportError].filter(Boolean) as string[]

  return (
    <div className="gx-page">
      <PageHead
        title="Dados"
        subtitle="Informações de uso dos alunos."
        tools={
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 32, width: '100%' }}>
            {p.institutionOptions.length > 1 ? (
              <label className="gx-field" style={{ margin: 0, minWidth: 200, flex: '0 1 280px' }}>
                <span className="gx-sr-only">Instituição</span>
                <select
                  className="gx-input"
                  style={{ height: 36, borderRadius: 999, paddingInline: 16, fontWeight: 700 }}
                  aria-label="Instituição"
                  value={p.selectedId ?? ''}
                  onChange={(e) => p.onSelectInstitution(e.target.value || null)}
                >
                  {p.institutionOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div
                className="gx-filter__btn gx-filter__btn--field"
                style={{ width: 'auto', maxWidth: '100%', cursor: 'default', flex: '0 1 auto', display: 'flex' }}
                aria-label="Instituição"
              >
                <span data-fade="1" style={{ fontWeight: 700 }}>
                  {p.institutionName}
                </span>
              </div>
            )}
            <div style={{ flex: '0 1 max(calc(50% - 6px), min(100%, 360px))', minWidth: 0 }}>
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

      <div className="gx-stats" aria-label="Resumo">
        <div className="gx-stat">
          <span>Alunos ativos</span>
          <strong>{p.summary.activeStudents}</strong>
        </div>
        <div className="gx-stat">
          <span>Trilhas ativas</span>
          <strong>{p.summary.activeTrails}</strong>
        </div>
        <div className="gx-stat">
          <span>Conclusão média</span>
          <strong>{pctText(p.summary.avgLessonCompletion)}</strong>
          {p.summary.avgLessonCompletion !== null ? (
            <span className="gx-bar" style={{ marginTop: 6 }}>
              <span style={{ width: `${p.summary.avgLessonCompletion}%` }} />
            </span>
          ) : (
            <span className="gx-bar" style={{ marginTop: 6 }} aria-hidden="true">
              <span className="gx-bar__empty" />
            </span>
          )}
        </div>
        <div className="gx-stat">
          <span>Acerto médio</span>
          <strong>{pctText(p.summary.avgAccuracy)}</strong>
          {p.summary.avgAccuracy !== null ? (
            <span className="gx-bar gx-bar--green" style={{ marginTop: 6 }}>
              <span style={{ width: `${p.summary.avgAccuracy}%` }} />
            </span>
          ) : (
            <>
              <span className="gx-bar gx-bar--green" style={{ marginTop: 6 }} aria-hidden="true">
                <span className="gx-bar__empty" />
              </span>
              <span className="gx-muted" style={{ fontSize: 12 }}>
                sem exercícios
              </span>
            </>
          )}
        </div>
      </div>

      {p.activeTab === 'students' ? (
        <div className="gx-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '24px 16px' }}>
          <section className="gx-card">
            <h2 style={{ fontSize: 16 }}>Conclusão das atividades</h2>
            {charts.completionBuckets.map((b) => (
              <BarRow key={b.key} label={b.label} count={b.count} max={bucketMax} />
            ))}
          </section>
          <section className="gx-card">
            <h2 style={{ fontSize: 16 }}>Situação dos alunos</h2>
            {charts.statuses.map((b) => (
              <BarRow
                key={b.key}
                label={b.key === 'completed' ? 'Concluiu' : b.label}
                count={b.count}
                max={statusMax}
                labelWidth={100}
              />
            ))}
          </section>
          <section className="gx-card gx-card--chart">
            <h2 style={{ fontSize: 16 }}>Alunos por etapa concluída</h2>
            <div className="gx-lesson-chart" role="img" aria-label="Alunos por etapa concluída">
              <div
                className="gx-lesson-chart__track"
                style={
                  {
                    ['--gx-lesson-cols']: String(
                      Math.max(1, charts.lessonBars.length),
                    ),
                  } as CSSProperties
                }
              >
                {charts.lessonBars.map((b) => {
                  const tip =
                    b.enrolledCount === 0
                      ? `${b.fullLabel ?? b.label}: sem alunos`
                      : `${b.fullLabel ?? b.label}: ${b.count} de ${b.enrolledCount}`
                  const barH =
                    b.count > 0 && lessonMax > 0
                      ? Math.max(4, (b.count / lessonMax) * 80)
                      : 0
                  // Rótulo curto E1, E2… (evita truncar "E1 Pro.." no celular).
                  const shortLabel = /^E\d+/i.test(b.label.trim())
                    ? b.label.trim().match(/^E\d+/i)![0].toUpperCase()
                    : b.label.trim()
                  return (
                    <div
                      key={b.key}
                      className="gx-lesson-chart__col"
                      title={tip}
                      aria-label={tip}
                    >
                      <strong className="gx-lesson-chart__n" title={tip}>
                        {b.count}
                      </strong>
                      <span
                        className="gx-lesson-chart__bar"
                        style={{
                          height: barH > 0 ? `${barH}%` : 4,
                          minHeight: 4,
                          background: barH > 0 ? undefined : 'transparent',
                          opacity: barH > 0 ? 1 : 0.35,
                        }}
                        aria-label={tip}
                        title={tip}
                      />
                      <span className="gx-lesson-chart__label" title={tip}>
                        {shortLabel}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      <section className="gx-card" aria-label="Uso do monitor" style={{ padding: 0, gap: 0 }}>
        <div className="gx-card__head" style={{ padding: '24px 24px 0', alignItems: 'flex-end' }}>
          <div>
            <h2>Uso do monitor</h2>
            <p className="gx-muted">
              {p.logsError
                ? 'Não foi possível carregar o uso do monitor.'
                : p.agentUsageUnavailable
                  ? 'Dados de uso indisponíveis neste momento.'
                  : 'Perguntas que os alunos fizeram ao monitor'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 4, background: 'var(--v-soft)', borderRadius: 999, padding: 4 }}>
            {periods.map(([days, label]) => (
              <button
                key={days}
                type="button"
                className="gx-tab"
                style={{ height: 32, padding: '0 14px', flex: 'none' }}
                aria-selected={p.agentPeriodDays === days}
                onClick={() => p.onAgentPeriodDaysChange(days)}
                disabled={Boolean(p.logsError) && !p.agentUsageLoading}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {p.logsError ? (
          <div style={{ padding: 24 }}>
            <p className="gx-muted" role="alert">
              Erro: {p.logsError}
            </p>
          </div>
        ) : (
          <div className="gx-stats" style={{ padding: 24, opacity: p.agentUsageLoading ? 0.5 : 1 }}>
            {agentKpis.map((k) => (
              <div className="gx-stat" key={k.label} title={'hint' in k ? k.hint : undefined}>
                <span>
                  {k.label}
                  {'hint' in k && k.hint ? (
                    <abbr
                      title={k.hint}
                      aria-label={k.hint}
                      style={{
                        marginLeft: 6,
                        fontWeight: 700,
                        color: 'var(--v-t3)',
                        textDecoration: 'none',
                        cursor: 'help',
                      }}
                    >
                      ?
                    </abbr>
                  ) : null}
                </span>
                <strong>{k.value}</strong>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="gx-card" aria-label="Oportunidades" style={{ padding: 24, gap: 28 }}>
        <div>
          <h2>Oportunidades</h2>
          <p className="gx-muted">
            {p.logsError
              ? 'Não foi possível carregar as oportunidades.'
              : 'Clique em um exercício para ver o enunciado'}
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
              <div key={title} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                <h3 style={{ fontSize: 15, color: 'var(--v-t2)' }}>{title}</h3>
                {list.map((row) => (
                  <Opportunity
                    key={`${title}-${row.key}`}
                    row={row}
                    open={openOpp === `${title}-${row.key}`}
                    onToggle={() => setOpenOpp((c) => (c === `${title}-${row.key}` ? null : `${title}-${row.key}`))}
                  />
                ))}
                {list.length === 0 ? <p className="gx-muted">N/A</p> : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="gx-card" aria-label="Alunos e exercícios" style={{ padding: 0, gap: 0, overflow: 'visible' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '24px 24px 20px' }}>
          <nav role="tablist" aria-label="Dados" className="gx-tabs" style={{ marginTop: 0 }}>
            <button role="tab" type="button" className="gx-tab" aria-selected={p.activeTab === 'students'} onClick={() => p.onActiveTabChange('students')}>
              Alunos <span className="gx-muted">({p.totalStudentCount})</span>
            </button>
            <button role="tab" type="button" className="gx-tab" aria-selected={p.activeTab === 'questions'} onClick={() => p.onActiveTabChange('questions')}>
              Exercícios <span className="gx-muted">({p.totalPillCount})</span>
            </button>
          </nav>
          {p.activeTab === 'students' ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              <div style={{ flex: '1 1 100%', minWidth: 0 }}>
                <FilterPopover
                  variant="field"
                  align="left"
                  label="Filtrar alunos"
                  options={p.studentFilterOptions.map((o) => ({ id: o.id, name: o.label }))}
                  selected={studentSel}
                  onChange={p.onStudentFilterChange}
                  emptyText="Nenhum aluno encontrado."
                />
              </div>
              {p.studentExportTrails.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {p.studentExportTrails.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="gx-btn"
                      disabled={p.exportingTrailId === t.id}
                      onClick={() => p.onExportTrailHistory(t.id)}
                    >
                      {p.exportingTrailId === t.id ? 'Exportando…' : `Exportar histórico: ${t.label}`}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span className="gx-muted">Clique no exercício para abrir o enunciado</span>
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
                    {p.visibleColumns
                      .filter((c) => ['phone', 'lessonsReleased', 'lessonsDone', 'lessonsCompletionPct', 'correct', 'wrong', 'accuracyPct'].includes(c.key))
                      .map((c) => (
                        <SortTh
                          key={c.key}
                          label={LABELS[c.key] ?? c.label}
                          sortKey={c.key}
                          current=""
                          indicator={c.sortIndicator}
                          onSort={p.onToggleStudentSort}
                          numeric={c.key !== 'phone'}
                        />
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
                      <td>{na(r.phone)}</td>
                      <td className="num">{r.lessonsReleased}</td>
                      <td className="num">{r.lessonsDone}</td>
                      <td className="num">
                        <strong>{pctText(r.lessonsCompletionPct)}</strong>
                        {r.lessonsCompletionPct !== null ? (
                          <span className="gx-bar" style={{ marginTop: 4 }}>
                            <span style={{ width: `${r.lessonsCompletionPct}%` }} />
                          </span>
                        ) : null}
                      </td>
                      <td className="num">{r.correct}</td>
                      <td className="num">{r.wrong}</td>
                      <td className="num">
                        <strong>{pctText(r.accuracyPct)}</strong>
                        {r.accuracyPct !== null ? (
                          <span className="gx-bar" style={{ marginTop: 4 }}>
                            <span style={{ width: `${r.accuracyPct}%` }} />
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                  {p.studentRowsEmpty ? (
                    <tr>
                      <td colSpan={8} className="gx-table__empty">
                        Nenhum aluno com os filtros atuais.
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

const LABELS: Record<string, string> = {
  phone: 'Telefone',
  lessonsReleased: 'Atividades liberadas',
  lessonsDone: 'Atividades feitas',
  lessonsCompletionPct: '% de conclusão',
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
      <tr>
        <td>
          <Link to={row.trailHref} style={{ color: 'var(--v-ink)', fontWeight: 700 }}>
            {row.trailName}
          </Link>
        </td>
        <td className="num">{row.questionNumber}</td>
        <td>
          <button
            type="button"
            aria-expanded={open}
            onClick={onToggle}
            style={{ border: 0, background: 'transparent', padding: 0, font: 'inherit', fontWeight: 600, color: 'var(--v-ink)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            {row.exerciseLabel}
            <span style={{ transform: open ? 'rotate(180deg)' : 'none', display: 'inline-flex' }}>
              <Icon name="chev-down" size={14} />
            </span>
          </button>
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
