import { useEffect, useMemo, useState } from 'react'
import { InstitutionCadastro } from '../components/InstitutionCadastro'
import { Link, useNavigate } from 'react-router-dom'
import { snapshotToExerciseAttempt } from '../lib/exerciseAttemptFirestore'
import {
  fetchInstitutionMetrics,
  getCachedMetrics,
  type InstitutionDashboardMetricsView,
} from '../lib/dashboardMetricsApi'
import {
  formatAtualizadoAs,
  METRICS_FRESH_MS,
  nextPinnedComputedAt,
  oldestComputedAt,
} from '../lib/metricsUpdatedAt'
import { inicioAcertoReady } from '../lib/dashboardAccuracyGate'
import { mergeAcertoAggregates } from '../lib/acertoMedio'
import {
  fmtDate,
  STATUS_LABEL,
  statusPillClass,
  activePillClass,
} from '../lib/gestaoFormat'
import {
  activityCountByTrail,
  activityKeysByTrail,
  formatPct,
  institutionMetrics,
  type InstitutionMetrics,
} from '../lib/gestaoMetrics'
import { snapshotToStudent } from '../lib/studentFirestore'
import { snapshotToStudentTrail } from '../lib/studentTrailFirestore'
import { snapshotToTrail } from '../lib/trailFirestore'
import { snapshotToTrailStageQuestion } from '../lib/trailStageQuestionFirestore'
import { useCollection } from '../hooks/useCollection'
import { useGestao } from '../hooks/useGestao'
import { usePermissions } from '../hooks/usePermissions'
import type { Institution } from '../types/institution'
import type { Student } from '../types/student'
import type { StudentTrail, StudentTrailStatus } from '../types/studentTrail'
import type { Trail } from '../types/trail'
import { joinList, scopeOf, studentInScope, trailInScope, turmasByTrail } from '../lib/turmas'
import {
  Banner,
  BootSymbol,
  Fade,
  FilterPopover,
  Icon,
  na,
  PageHead,
  Pager,
  ScrollX,
  SortHead,
  sortRows,
  Stat,
  usePager,
  type SortState,
} from '../design/gx/ui'

function StatsRow({
  m,
  metricsLoading,
  countsLoading,
}: {
  m: InstitutionMetrics
  /** Métricas do servidor ainda não chegaram → Carregando… (nunca % parcial). */
  metricsLoading?: boolean
  /** Alunos/trilhas ainda não prontos → Carregando… (nunca 0 flash). */
  countsLoading?: boolean
}) {
  return (
    <div className="gx-stats">
      <Stat
        label="Alunos ativos"
        value={countsLoading ? 'Carregando…' : m.activeStudents}
      />
      <Stat
        label="Trilhas ativas"
        value={countsLoading ? 'Carregando…' : m.activeTrails}
      />
      <Stat
        label="Conclusão média"
        hint="% de atividades concluídas (não por etapa)"
        value={metricsLoading ? 'Carregando…' : formatPct(m.avgCompletion)}
        bar={metricsLoading ? null : m.avgCompletion}
      />
      <Stat
        label="Acerto médio"
        value={metricsLoading ? 'Carregando…' : formatPct(m.avgAccuracy)}
        bar={metricsLoading ? null : m.avgAccuracy}
        barTone="green"
      />
    </div>
  )
}

function ArrowButton({
  label,
  onClick,
  ariaLabel,
}: {
  label: string
  onClick: () => void
  ariaLabel?: string
}) {
  return (
    <button
      type="button"
      className="gx-btn gx-btn--outline"
      onClick={onClick}
      aria-label={ariaLabel ?? label}
    >
      {label}
      <span style={{ color: 'var(--v-green)', display: 'inline-flex' }}>
        <Icon name="chev-right" size={14} />
      </span>
    </button>
  )
}

/** Início do Super admin: faixa de totais e uma linha por instituição (1.1.24). */
function SuperHome({
  metrics,
  metricsReady,
  metricsFailed,
  metricsError,
  onRetryMetrics,
  onForceRefreshMetrics,
  metricsForceRefreshing,
  metricsUpdatedAtLabel,
}: {
  metrics: Map<string, InstitutionMetrics>
  /** Instituições cujo /api/dashboard_metrics já chegou. */
  metricsReady: ReadonlySet<string>
  metricsFailed: ReadonlySet<string>
  metricsError: string | null
  onRetryMetrics: () => void
  onForceRefreshMetrics: () => void
  metricsForceRefreshing?: boolean
  metricsUpdatedAtLabel?: string | null
}) {
  const g = useGestao()
  const navigate = useNavigate()
  const { canNav } = usePermissions()

  const totals = useMemo(() => {
    const scopedIds = g.scopedInstitutions.map((i) => i.id)
    const list = g.scopedInstitutions.map((i) => metrics.get(i.id))
    const sum = (pick: (m: InstitutionMetrics) => number) =>
      list.reduce((n, m) => n + (m ? pick(m) : 0), 0)
    // Só agrega quando TODAS as do filtro têm métricas (evita 0% parcial).
    const readyMap = new Map(
      [...metricsReady].map((id) => [id, new Map<string, string>()] as const),
    )
    const acertoReady = inicioAcertoReady(scopedIds, readyMap)
    const settled = scopedIds.every(
      (id) => metricsReady.has(id) || metricsFailed.has(id),
    )
    const combinedAcerto = acertoReady
      ? mergeAcertoAggregates(
          list
            .filter((m): m is InstitutionMetrics => Boolean(m))
            .map((m) => ({
              correct: m.accuracyCorrect,
              tried: m.accuracyTried,
            })),
        )
      : null
    return {
      cards: [
        { label: 'Instituições', value: g.scopedInstitutions.length },
        { label: 'Alunos ativos', value: sum((m) => m.activeStudents) },
        {
          label: 'Ativos (7 dias)',
          value: sum((m) => m.activeLast7Days),
          hint: 'Alunos com exercise_attempts nos últimos 7 dias. Não usa last_interaction_at do vínculo (pode ter atualização em lote).',
        },
        { label: 'Trilhas ativas', value: sum((m) => m.activeTrails) },
        { label: 'Em andamento', value: sum((m) => m.inProgress) },
      ],
      combinedAccuracy: combinedAcerto?.avgAccuracy ?? null,
      combinedLoading: g.scopedInstitutions.length > 1 && !settled,
      showCombinedAccuracy: g.scopedInstitutions.length > 1,
    }
  }, [g.scopedInstitutions, metrics, metricsReady, metricsFailed])

  function openScoped(inst: Institution, path: string) {
    g.setSelectedIds(new Set([inst.id]))
    // Mesmo caminho do F5: Dados sempre com ?inst= (evita corrida com storage/filtro).
    const sep = path.includes('?') ? '&' : '?'
    navigate(`${path}${sep}inst=${encodeURIComponent(inst.id)}`)
  }

  return (
    <div className="gx-page">
      <PageHead
        title="Instituições"
        subtitle="Resumo das instituições cadastradas."
        actions={
          <>
            {metricsUpdatedAtLabel ? (
              <span className="gx-muted" style={{ fontSize: 13, fontWeight: 600 }}>
                {metricsUpdatedAtLabel}
              </span>
            ) : null}
            <button
              type="button"
              className="gx-btn gx-btn--outline"
              onClick={onForceRefreshMetrics}
              disabled={Boolean(metricsForceRefreshing)}
              aria-busy={metricsForceRefreshing || undefined}
              title="Recalcular métricas no servidor"
            >
              {metricsForceRefreshing ? 'Atualizando…' : 'Atualizar'}
            </button>
            {canNav('admin') ? (
              <Link to="/usuarios" className="gx-btn">
                Usuários
              </Link>
            ) : null}
            {canNav('institution_new') ? (
              <Link to="/instituicoes/novo" className="gx-btn gx-btn--primary gx-btn--pulse">
                + Nova instituição
              </Link>
            ) : null}
          </>
        }
      />
      {g.institutions.length === 0 ? (
        <p className="gx-empty">Nenhuma instituição disponível para o seu usuário.</p>
      ) : (
        <>
          {metricsError ? (
            <Banner onRetry={onRetryMetrics}>{metricsError}</Banner>
          ) : null}
          <div className="gx-stats" aria-label="Resumo">
            {totals.cards.map((t) => (
              <Stat
                key={t.label}
                label={t.label}
                value={t.value}
                hint={'hint' in t ? t.hint : undefined}
              />
            ))}
            {totals.showCombinedAccuracy ? (
              <Stat
                label="Acerto médio (filtro)"
                value={
                  totals.combinedLoading
                    ? 'Carregando…'
                    : formatPct(totals.combinedAccuracy)
                }
                bar={totals.combinedLoading ? null : totals.combinedAccuracy}
                barTone="green"
                hint="Média ponderada das instituições selecionadas (correct/tried), igual ao card Dados. Só aparece quando todas carregaram."
              />
            ) : null}
          </div>
          <section aria-label="Instituições" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {g.scopedInstitutions.map((inst) => {
              const m = metrics.get(inst.id)
              const instName = inst.name || inst.id
              const metricsLoading =
                !metricsReady.has(inst.id) && !metricsFailed.has(inst.id)
              return (
                <article className="gx-card" key={inst.id}>
                  <header className="gx-card__head">
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <Fade as="h3">{instName}</Fade>
                        <Link to={`/instituicoes/${inst.id}`} className="gx-btn gx-btn--icon gx-btn--ghost" aria-label={`Editar ${instName}`} title="Editar">
                          <Icon name="pencil" size={16} />
                        </Link>
                      </div>
                      <p className="gx-muted">
                        <span className="gx-tag">ID {inst.id}</span> {na(inst.type)}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <ArrowButton
                        label="Dados"
                        ariaLabel={`Dados de ${instName}`}
                        onClick={() => openScoped(inst, '/dashboard')}
                      />
                      <ArrowButton
                        label="Trilhas"
                        ariaLabel={`Trilhas de ${instName}`}
                        onClick={() => openScoped(inst, '/trilhas')}
                      />
                      <ArrowButton
                        label="Alunos"
                        ariaLabel={`Alunos de ${instName}`}
                        onClick={() => openScoped(inst, '/alunos')}
                      />
                    </div>
                  </header>
                  {metricsFailed.has(inst.id) && !metricsReady.has(inst.id) ? (
                    <p className="gx-muted" role="alert">
                      Não foi possível carregar as métricas.{' '}
                      <button
                        type="button"
                        className="gx-btn gx-btn--outline"
                        onClick={onRetryMetrics}
                      >
                        Tentar de novo
                      </button>
                    </p>
                  ) : m ? (
                    <StatsRow m={m} metricsLoading={metricsLoading} />
                  ) : null}
                </article>
              )
            })}
            {g.scopedInstitutions.length === 0 ? (
              <p className="gx-empty">Nenhuma instituição selecionada.</p>
            ) : null}
          </section>
        </>
      )}
    </div>
  )
}

type StudentLine = {
  student: Student
  trailName: string
  status: StudentTrailStatus | null
}

/** Início do perfil Instituição: cadastro, resumo, trilhas e alunos da escola (1.1.24). */
function SchoolHome({
  institution,
  metrics,
  metricsLoading,
  metricsFailed,
  metricsError,
  onRetryMetrics,
  onForceRefreshMetrics,
  metricsForceRefreshing,
  metricsUpdatedAtLabel,
  countsLoading,
  trails,
  students,
  studentTrails,
}: {
  institution: Institution
  metrics: InstitutionMetrics | undefined
  metricsLoading?: boolean
  metricsFailed?: boolean
  metricsError?: string | null
  onRetryMetrics?: () => void
  onForceRefreshMetrics?: () => void
  metricsForceRefreshing?: boolean
  metricsUpdatedAtLabel?: string | null
  countsLoading?: boolean
  trails: Trail[]
  students: Student[]
  studentTrails: StudentTrail[]
}) {
  const navigate = useNavigate()
  const { canNav } = usePermissions()
  /* Trilhas (1.3.12: Matéria, Turma, Trilha; turma da trilha pelas turmas dos alunos vinculados). */
  const turmasTrail = useMemo(() => turmasByTrail(studentTrails, students), [studentTrails, students])
  const [trailSel, setTrailSel] = useState<Set<string> | null>(null)
  const trailSelected = useMemo(
    () => trailSel ?? new Set(trails.map((t) => t.id)),
    [trailSel, trails],
  )
  const [trailSort, setTrailSort] = useState<SortState | null>({ key: 'name', dir: 'asc' })
  const trailRows = useMemo(
    () =>
      sortRows(
        trails.filter((t) => trailSelected.has(t.id)),
        trailSort,
        (t, k) =>
          k === 'name'
            ? t.name
            : k === 'subject'
              ? t.subject
              : k === 'turma'
                ? joinList(turmasTrail.get(t.id), '')
              : k === 'active'
                ? t.active
                  ? 'Sim'
                  : 'Não'
                : k === 'created'
                  ? (t.created_at?.toMillis?.() ?? null)
                  : '',
      ),
    [trails, trailSelected, trailSort, turmasTrail],
  )
  const trailPager = usePager(trailRows, 5)

  /* Alunos */
  const lines = useMemo<StudentLine[]>(() => {
    const trailName = new Map(trails.map((t) => [t.id, t.name]))
    return students.map((s) => {
      const links = studentTrails
        .filter((st) => st.student_id === s.id)
        .sort(
          (a, b) =>
            (b.last_interaction_at?.toMillis?.() ?? 0) -
            (a.last_interaction_at?.toMillis?.() ?? 0),
        )
      const top = links[0]
      return {
        student: s,
        trailName: top ? (trailName.get(top.trail_id) ?? 'N/A') : 'N/A',
        status: top ? top.status : null,
      }
    })
  }, [students, studentTrails, trails])
  const [stuSel, setStuSel] = useState<Set<string> | null>(null)
  const stuSelected = useMemo(
    () => stuSel ?? new Set(students.map((s) => s.id)),
    [stuSel, students],
  )
  const [stuSort, setStuSort] = useState<SortState | null>({ key: 'name', dir: 'asc' })
  const stuRows = useMemo(
    () =>
      sortRows(
        lines.filter((l) => stuSelected.has(l.student.id)),
        stuSort,
        (l, k) =>
          k === 'name'
            ? l.student.name
            : k === 'turma'
              ? (l.student.turma ?? '').trim() || null
            : k === 'trail'
              ? l.trailName
              : k === 'status'
                ? l.status
                  ? STATUS_LABEL[l.status]
                  : null
                : k === 'active'
                  ? l.student.active
                    ? 'Sim'
                    : 'Não'
                  : k === 'created'
                    ? (l.student.created_at?.toMillis?.() ?? null)
                    : '',
      ),
    [lines, stuSelected, stuSort],
  )
  const stuPager = usePager(stuRows, 5)

  return (
    <div className="gx-page">
      <PageHead
        title={institution.name || institution.id}
        subtitle="Resumo das informações da escola."
        actions={
          <>
            {metricsUpdatedAtLabel ? (
              <span className="gx-muted" style={{ fontSize: 13, fontWeight: 600 }}>
                {metricsUpdatedAtLabel}
              </span>
            ) : null}
            {onForceRefreshMetrics ? (
              <button
                type="button"
                className="gx-btn gx-btn--outline"
                onClick={onForceRefreshMetrics}
                disabled={Boolean(metricsForceRefreshing)}
                aria-busy={metricsForceRefreshing || undefined}
                title="Recalcular métricas no servidor"
              >
                {metricsForceRefreshing ? 'Atualizando…' : 'Atualizar'}
              </button>
            ) : null}
          </>
        }
      />
      <InstitutionCadastro institution={institution} />

      {canNav('dashboard') ? (
        <div style={{ display: 'flex' }}>
          <ArrowButton label="Dados" onClick={() => navigate('/dashboard')} />
        </div>
      ) : null}
      {metricsError ? (
        <Banner onRetry={onRetryMetrics}>{metricsError}</Banner>
      ) : null}
      {metricsFailed && !metrics ? (
        <p className="gx-muted" role="alert">
          Não foi possível carregar as métricas.{' '}
          <button
            type="button"
            className="gx-btn gx-btn--outline"
            onClick={onRetryMetrics}
          >
            Tentar de novo
          </button>
        </p>
      ) : metrics ? (
        <StatsRow
          m={metrics}
          metricsLoading={metricsLoading}
          countsLoading={countsLoading}
        />
      ) : null}

      {canNav('trail_new') ? (
        <div style={{ display: 'flex' }}>
          <ArrowButton label="Trilhas" onClick={() => navigate('/trilhas')} />
        </div>
      ) : null}
      <div className="gx-head__tools">
        <div style={{ flex: '0 1 max(calc(50% - 6px), min(100%, 360px))', minWidth: 0 }}>
          <FilterPopover
            variant="field"
            align="left"
            label="Filtrar trilhas"
            options={trails.map((t) => ({ id: t.id, name: t.name || t.id }))}
            selected={trailSelected}
            onChange={(n) => {
              setTrailSel(n)
              trailPager.reset()
            }}
            emptyText="Nada encontrado."
          />
        </div>
      </div>
      <section className="gx-card" aria-label="Trilhas" style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
        <ScrollX>
          <table className="gx-table">
            <thead>
              <tr>
                <SortHead label="Matéria" sortKey="subject" sort={trailSort} onSort={setTrailSort} />
                <SortHead label="Turma" sortKey="turma" sort={trailSort} onSort={setTrailSort} />
                <SortHead label="Trilha" sortKey="name" sort={trailSort} onSort={setTrailSort} />
                <SortHead label="Criada em" sortKey="created" sort={trailSort} onSort={setTrailSort} />
                <SortHead label="Ativa" sortKey="active" sort={trailSort} onSort={setTrailSort} />
                <th />
              </tr>
            </thead>
            <tbody>
              {trailPager.slice.map((t) => (
                <tr key={t.id}>
                  <td>{na(t.subject)}</td>
                  <td>{joinList(turmasTrail.get(t.id))}</td>
                  <td>
                    <Link to={`/trilhas/${t.id}`} style={{ color: 'var(--v-ink)', fontWeight: 700 }}>
                      {t.name || t.id}
                    </Link>
                  </td>
                  <td>{fmtDate(t.created_at)}</td>
                  <td>
                    <span className={activePillClass(t.active)}>{t.active ? 'Sim' : 'Não'}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Link to={`/trilhas/${t.id}`} className="gx-btn">
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
              {trailPager.total === 0 ? (
                <tr>
                  <td colSpan={6} className="gx-table__empty">
                    Nenhuma trilha encontrada.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </ScrollX>
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--v-soft2)' }}>
          <Pager pager={trailPager} noun="trilha" nounPlural="trilhas" sizes={[5, 10, 30, 50]} gateAt={10} />
        </div>
      </section>

      {canNav('student_new') ? (
        <div style={{ display: 'flex' }}>
          <ArrowButton label="Alunos" onClick={() => navigate('/alunos')} />
        </div>
      ) : null}
      <div className="gx-head__tools">
        <div style={{ flex: '0 1 max(calc(50% - 6px), min(100%, 360px))', minWidth: 0 }}>
          <FilterPopover
            variant="field"
            align="left"
            label="Filtrar alunos"
            options={students.map((s) => ({ id: s.id, name: s.name || s.id }))}
            selected={stuSelected}
            onChange={(n) => {
              setStuSel(n)
              stuPager.reset()
            }}
            emptyText="Nada encontrado."
          />
        </div>
      </div>
      <section className="gx-card" aria-label="Alunos" style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
        <ScrollX>
          <table className="gx-table">
            <thead>
              <tr>
                <SortHead label="Nome" sortKey="name" sort={stuSort} onSort={setStuSort} />
                <SortHead label="Turma" sortKey="turma" sort={stuSort} onSort={setStuSort} />
                <SortHead label="Trilha" sortKey="trail" sort={stuSort} onSort={setStuSort} />
                <SortHead label="Status" sortKey="status" sort={stuSort} onSort={setStuSort} />
                <SortHead label="Ativo" sortKey="active" sort={stuSort} onSort={setStuSort} />
                <SortHead label="Criado em" sortKey="created" sort={stuSort} onSort={setStuSort} />
                <th />
              </tr>
            </thead>
            <tbody>
              {stuPager.slice.map((l) => (
                <tr key={l.student.id}>
                  <td>
                    <Link to={`/alunos/${l.student.id}`} style={{ color: 'var(--v-ink)', fontWeight: 700 }}>
                      {l.student.name || l.student.id}
                    </Link>
                  </td>
                  <td>{na((l.student.turma ?? '').trim() || null)}</td>
                  <td>{l.trailName}</td>
                  <td>
                    <span className={statusPillClass(l.status)}>
                      {l.status ? STATUS_LABEL[l.status] : 'N/A'}
                    </span>
                  </td>
                  <td>
                    <span className={activePillClass(l.student.active)}>{l.student.active ? 'Sim' : 'Não'}</span>
                  </td>
                  <td>{fmtDate(l.student.created_at)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <Link to={`/alunos/${l.student.id}`} className="gx-btn">
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
              {stuPager.total === 0 ? (
                <tr>
                  <td colSpan={7} className="gx-table__empty">
                    Nenhum aluno encontrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </ScrollX>
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--v-soft2)' }}>
          <Pager pager={stuPager} noun="aluno" nounPlural="alunos" sizes={[5, 10, 30, 50]} gateAt={10} />
        </div>
      </section>

    </div>
  )
}

export function HomePage() {
  const g = useGestao()
  const { adminProfile } = usePermissions()
  const scope = scopeOf(adminProfile)
  const students = useCollection('students', snapshotToStudent)
  const trails = useCollection('trails', snapshotToTrail)
  const links = useCollection('student_trails', snapshotToStudentTrail)
  const questions = useCollection('trail_stage_questions', snapshotToTrailStageQuestion)
  const attempts = useCollection('exercise_attempts', snapshotToExerciseAttempt)
  /** Métricas pré-agregadas (/api/dashboard_metrics) — sem answerMap da Sol. */
  const [serverMetrics, setServerMetrics] = useState<
    Map<string, InstitutionDashboardMetricsView>
  >(() => {
    const seed = new Map<string, InstitutionDashboardMetricsView>()
    for (const inst of g.institutions) {
      const hit = getCachedMetrics(inst.id)
      if (hit) seed.set(inst.id, hit)
    }
    return seed
  })
  const [metricsFailed, setMetricsFailed] = useState<Set<string>>(
    () => new Set(),
  )
  const [metricsError, setMetricsError] = useState<string | null>(null)
  const [metricsRetryKey, setMetricsRetryKey] = useState(0)
  const [metricsForceRefreshing, setMetricsForceRefreshing] = useState(false)
  /** Carimbo estável: só muda no settle inicial do escopo ou após Atualizar. */
  const [stampPin, setStampPin] = useState<{ key: string; ms: number } | null>(
    null,
  )

  const instIdsKey = useMemo(
    () => g.institutions.map((i) => i.id).sort().join('|'),
    [g.institutions],
  )

  useEffect(() => {
    let cancelled = false
    const ids = g.institutions.map((i) => i.id).filter(Boolean)
    if (ids.length === 0) {
      setServerMetrics(new Map())
      setMetricsFailed(new Set())
      setMetricsError(null)
      return
    }

    setServerMetrics((prev) => {
      const next = new Map(prev)
      for (const id of ids) {
        const hit = getCachedMetrics(id)
        if (hit) next.set(id, hit)
      }
      return next
    })
    setMetricsFailed(new Set())
    setMetricsError(null)

    const missing = ids.filter((id) => !getCachedMetrics(id))
    missing.sort((a, b) => {
      if (a === 'i2') return -1
      if (b === 'i2') return 1
      return a.localeCompare(b)
    })
    // Lê cache (sem refresh=1). Faltantes primeiro; já em sessão em background.
    const order = [...missing, ...ids.filter((id) => getCachedMetrics(id))]
    const unique = [...new Set(order)]

    void (async () => {
      const started = performance.now()
      const [first, ...rest] = unique
      const failed = new Set<string>()
      let firstError: string | null = null
      const loadOne = async (id: string) => {
        try {
          // Sem refresh=1; revalidate=true força rede mesmo com sessão.
          const m = await fetchInstitutionMetrics(id, {
            revalidate: getCachedMetrics(id) != null,
          })
          if (cancelled) return
          setServerMetrics((prev) => {
            const next = new Map(prev)
            next.set(id, m)
            return next
          })
          setMetricsFailed((prev) => {
            if (!prev.has(id)) return prev
            const next = new Set(prev)
            next.delete(id)
            return next
          })
        } catch (err) {
          if (cancelled) return
          failed.add(id)
          if (!firstError) {
            firstError =
              err instanceof Error
                ? err.message
                : 'Não foi possível carregar as métricas.'
          }
          setMetricsFailed((prev) => {
            const next = new Set(prev)
            next.add(id)
            return next
          })
        }
      }
      if (first) await loadOne(first)
      await Promise.all(rest.map((id) => loadOne(id)))
      if (!cancelled) {
        setMetricsError(
          failed.size > 0
            ? firstError ??
                `Não foi possível carregar métricas (${failed.size}).`
            : null,
        )
        console.info(
          `[inicio] metrics em ${Math.round(performance.now() - started)}ms (${unique.length} inst) fail=${failed.size}`,
        )
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- instIdsKey + retry
  }, [instIdsKey, metricsRetryKey])

  const retryMetrics = () => {
    setMetricsError(null)
    setMetricsFailed(new Set())
    setMetricsRetryKey((k) => k + 1)
  }

  /** Recalc explícito (refresh=1). Cron também regenera; load normal nunca força. */
  const forceRefreshMetrics = () => {
    if (metricsForceRefreshing) return
    void (async () => {
      const ids = g.institutions.map((i) => i.id).filter(Boolean)
      const scopedIds = g.isSuper
        ? g.scopedInstitutions.map((i) => i.id)
        : g.myInstitutionId
          ? [g.myInstitutionId]
          : ids
      const scopeKey = scopedIds.join(',')
      setMetricsForceRefreshing(true)
      setMetricsError(null)
      setMetricsFailed(new Set())
      const failed = new Set<string>()
      let firstError: string | null = null
      const nextMap = new Map<string, InstitutionDashboardMetricsView>()
      try {
        for (const id of ids) {
          try {
            const m = await fetchInstitutionMetrics(id, {
              force: true,
              timeoutMs: 55_000,
            })
            nextMap.set(id, m)
            setServerMetrics((prev) => {
              const next = new Map(prev)
              next.set(id, m)
              return next
            })
          } catch (err) {
            failed.add(id)
            if (!firstError) {
              firstError =
                err instanceof Error
                  ? err.message
                  : 'Falha ao atualizar métricas.'
            }
          }
        }
        setMetricsFailed(failed)
        setMetricsError(
          failed.size > 0
            ? firstError ?? `Falha ao atualizar (${failed.size}).`
            : null,
        )
        // Re-pina com o computed_at fresco (não reusa o pin pré-force).
        const freshOldest = oldestComputedAt(
          scopedIds.map((id) => nextMap.get(id)?.computedAt),
        )
        if (freshOldest != null && scopeKey) {
          setStampPin({ key: scopeKey, ms: freshOldest })
        }
      } finally {
        setMetricsForceRefreshing(false)
      }
    })()
  }

  // Refetch a cada 10 min com a tela aberta (SWR: não limpa valor).
  useEffect(() => {
    const ids = g.institutions.map((i) => i.id).filter(Boolean)
    if (ids.length === 0) return
    let cancelled = false
    const tick = async () => {
      if (document.visibilityState === 'hidden') return
      for (const id of ids) {
        try {
          const m = await fetchInstitutionMetrics(id, { revalidate: true })
          if (cancelled) return
          setServerMetrics((prev) => {
            const next = new Map(prev)
            next.set(id, m)
            return next
          })
        } catch {
          // mantém
        }
      }
    }
    const timer = window.setInterval(() => {
      void tick()
    }, METRICS_FRESH_MS)
    const onVis = () => {
      if (document.visibilityState === 'visible') void tick()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [instIdsKey, g.institutions])

  // Alunos/conclusão local; acerto vem do doc de métricas (sem 57k answers).
  const ready =
    students.ready &&
    trails.ready &&
    links.ready &&
    questions.ready &&
    attempts.ready
  const error = students.error ?? trails.error ?? links.error ?? questions.error ?? attempts.error

  const metricsReady = useMemo(
    () => new Set(serverMetrics.keys()),
    [serverMetrics],
  )

  const metrics = useMemo(() => {
    const totals = activityCountByTrail(questions.rows)
    const catalogs = activityKeysByTrail(questions.rows)
    const map = new Map<string, InstitutionMetrics>()
    for (const inst of g.institutions) {
      const local = institutionMetrics({
        institutionId: inst.id,
        students: students.rows,
        trails: trails.rows,
        studentTrails: links.rows,
        activityTotals: totals,
        activityCatalogs: catalogs,
        attempts: attempts.rows,
        // undefined = ainda carregando acerto (não publica attempts-only).
        answerMap: serverMetrics.has(inst.id) ? new Map() : undefined,
        questions: questions.rows,
      })
      const sm = serverMetrics.get(inst.id)
      if (sm) {
        map.set(inst.id, {
          ...local,
          // Contagens do doc de métricas: evita flash 0 enquanto Firestore hidrata.
          activeStudents: sm.activeStudents,
          activeTrails: sm.activeTrails,
          avgAccuracy: sm.avgAccuracy,
          accuracyCorrect: sm.accuracyCorrect,
          accuracyTried: sm.accuracyTried,
          // Conclusão canônica = por atividade (não por etapa/aula).
          avgCompletion: sm.avgCompletion ?? local.avgCompletion,
        })
      } else {
        map.set(inst.id, local)
      }
    }
    return map
  }, [
    g.institutions,
    students.rows,
    trails.rows,
    links.rows,
    questions.rows,
    attempts.rows,
    serverMetrics,
  ])

  // Com métricas em sessão, mostra Início na hora (volta Dados→Início <0,5s).
  const hasMetricsSeed =
    serverMetrics.size > 0 ||
    g.institutions.some((i) => Boolean(getCachedMetrics(i.id)))

  const mine = g.myInstitutionId
    ? g.institutions.find((i) => i.id === g.myInstitutionId)
    : undefined

  const scopedIdsForStamp = g.isSuper
    ? g.scopedInstitutions.map((i) => i.id)
    : mine
      ? [mine.id]
      : []
  const stampScopeKey = scopedIdsForStamp.join(',')
  const stampAllReady =
    scopedIdsForStamp.length > 0 &&
    scopedIdsForStamp.every((id) => {
      const at = serverMetrics.get(id)?.computedAt
      return typeof at === 'number' && at > 0
    })
  const liveOldest = stampAllReady
    ? oldestComputedAt(
        scopedIdsForStamp.map((id) => serverMetrics.get(id)?.computedAt),
      )
    : null
  useEffect(() => {
    if (metricsForceRefreshing) return
    const next = nextPinnedComputedAt({
      scopeKey: stampScopeKey,
      liveOldest,
      pinned: stampPin,
    })
    if (
      next &&
      (stampPin?.key !== next.key || stampPin?.ms !== next.ms)
    ) {
      setStampPin(next)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pin só no settle/escopo
  }, [stampScopeKey, liveOldest, metricsForceRefreshing])
  const metricsUpdatedAtLabel = formatAtualizadoAs(
    stampPin?.key === stampScopeKey ? stampPin.ms : liveOldest,
  )

  const schoolCountsLoading =
    Boolean(mine) &&
    !serverMetrics.has(mine!.id) &&
    !(students.ready && trails.ready)

  if (g.institutionsLoading) return <BootSymbol />
  if (!ready && !hasMetricsSeed) return <BootSymbol />

  return (
    <>
      {error ? (
        <Banner
          onRetry={() => {
            students.retry()
            trails.retry()
            links.retry()
            questions.retry()
            attempts.retry()
          }}
        >
          Não foi possível carregar os dados. Tente atualizar a página.
        </Banner>
      ) : null}
      {g.isSuper || !mine ? (
        <SuperHome
          metrics={metrics}
          metricsReady={metricsReady}
          metricsFailed={metricsFailed}
          metricsError={metricsError}
          onRetryMetrics={retryMetrics}
          onForceRefreshMetrics={forceRefreshMetrics}
          metricsForceRefreshing={metricsForceRefreshing}
          metricsUpdatedAtLabel={metricsUpdatedAtLabel}
        />
      ) : (
        <SchoolHome
          institution={mine}
          metrics={metrics.get(mine.id)}
          metricsLoading={
            !metricsReady.has(mine.id) && !metricsFailed.has(mine.id)
          }
          metricsFailed={metricsFailed.has(mine.id)}
          metricsError={metricsError}
          onRetryMetrics={retryMetrics}
          onForceRefreshMetrics={forceRefreshMetrics}
          metricsForceRefreshing={metricsForceRefreshing}
          metricsUpdatedAtLabel={metricsUpdatedAtLabel}
          countsLoading={schoolCountsLoading}
          // 1.3.18: o Professor só vê as trilhas das matérias e os alunos das turmas dele.
          trails={trails.rows.filter((t) => t.institution_id === mine.id && trailInScope(scope, t))}
          students={students.rows.filter((s) => s.institution_id === mine.id && studentInScope(scope, s))}
          studentTrails={links.rows.filter((l) => l.institution_id === mine.id)}
        />
      )}
    </>
  )
}
