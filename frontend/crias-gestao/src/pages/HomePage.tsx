import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { updateInstitution } from '../lib/institutionFirestore'
import { snapshotToExerciseAttempt } from '../lib/exerciseAttemptFirestore'
import { fetchDashboardLogSummary } from '../lib/dashboardSummaryApi'
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
import {
  Banner,
  BootSymbol,
  ConfirmDialog,
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

function StatsRow({ m }: { m: InstitutionMetrics }) {
  return (
    <div className="gx-stats">
      <Stat label="Alunos ativos" value={m.activeStudents} />
      <Stat label="Trilhas ativas" value={m.activeTrails} />
      <Stat
        label="Conclusão média"
        value={formatPct(m.avgCompletion)}
        bar={m.avgCompletion}
      />
      <Stat
        label="Acerto médio"
        value={formatPct(m.avgAccuracy)}
        bar={m.avgAccuracy}
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
}: {
  metrics: Map<string, InstitutionMetrics>
}) {
  const g = useGestao()
  const navigate = useNavigate()
  const { canNav } = usePermissions()

  const totals = useMemo(() => {
    const list = g.scopedInstitutions.map((i) => metrics.get(i.id))
    const sum = (pick: (m: InstitutionMetrics) => number) =>
      list.reduce((n, m) => n + (m ? pick(m) : 0), 0)
    return [
      { label: 'Instituições', value: g.scopedInstitutions.length },
      { label: 'Alunos ativos', value: sum((m) => m.activeStudents) },
      {
        label: 'Ativos (7 dias)',
        value: sum((m) => m.activeLast7Days),
        hint: 'Alunos com exercise_attempts nos últimos 7 dias. Não usa last_interaction_at do vínculo (pode ter atualização em lote).',
      },
      { label: 'Trilhas ativas', value: sum((m) => m.activeTrails) },
      { label: 'Em andamento', value: sum((m) => m.inProgress) },
    ]
  }, [g.scopedInstitutions, metrics])

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
          <div className="gx-stats" aria-label="Resumo">
            {totals.map((t) => (
              <Stat
                key={t.label}
                label={t.label}
                value={t.value}
                hint={'hint' in t ? t.hint : undefined}
              />
            ))}
          </div>
          <section aria-label="Instituições" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {g.scopedInstitutions.map((inst) => {
              const m = metrics.get(inst.id)
              const instName = inst.name || inst.id
              return (
                <article className="gx-card" key={inst.id}>
                  <header className="gx-card__head">
                    <div style={{ minWidth: 0 }}>
                      <Fade as="h3">{instName}</Fade>
                      <p className="gx-muted">{na(inst.type)}</p>
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
                  {m ? <StatsRow m={m} /> : null}
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
  trails,
  students,
  studentTrails,
}: {
  institution: Institution
  metrics: InstitutionMetrics | undefined
  trails: Trail[]
  students: Student[]
  studentTrails: StudentTrail[]
}) {
  const navigate = useNavigate()
  const g = useGestao()
  const { canNav } = usePermissions()
  const [name, setName] = useState(institution.name)
  const [type, setType] = useState(institution.type)
  const [confirm, setConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(institution.name)
    setType(institution.type)
  }, [institution.name, institution.type])

  const changed =
    name.trim() !== institution.name.trim() || type.trim() !== institution.type.trim()
  const valid = name.trim() !== '' && type.trim() !== ''

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await updateInstitution(institution.id, {
        name: name.trim(),
        type: type.trim(),
        active: institution.active,
      })
      setSaved(true)
      setConfirm(false)
      window.setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar.')
      setConfirm(false)
    } finally {
      setSaving(false)
    }
  }

  /* Trilhas */
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
              : k === 'active'
                ? t.active
                  ? 'Sim'
                  : 'Não'
                : k === 'created'
                  ? (t.created_at?.toMillis?.() ?? null)
                  : '',
      ),
    [trails, trailSelected, trailSort],
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
      <PageHead title={institution.name || institution.id} subtitle="Resumo das informações da escola." />
      {error ? <Banner>{error}</Banner> : null}
      <section className="gx-card" aria-label="Cadastro">
        <div className="gx-card__head">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, minWidth: 0, flexWrap: 'wrap' }}>
            <h2>Cadastro</h2>
            <span className="gx-muted" style={{ fontSize: 12 }}>
              ID {institution.id} · Criada em {fmtDate(institution.created_at)} · Atualizada em{' '}
              {fmtDate(institution.updated_at)}
            </span>
          </div>
          <button
            type="button"
            className="gx-btn gx-btn--primary gx-btn--sm"
            disabled={!changed || !valid || saving}
            onClick={() => setConfirm(true)}
          >
            Salvar
          </button>
        </div>
        <div className="gx-grid">
          <label className="gx-field">
            <span>Nome</span>
            <input className="gx-input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="gx-field">
            <span>Tipo</span>
            <input className="gx-input" value={type} onChange={(e) => setType(e.target.value)} />
          </label>
        </div>
        {saved ? <Banner tone="ok">Alterações salvas.</Banner> : null}
      </section>

      {canNav('dashboard') ? (
        <div style={{ display: 'flex' }}>
          <ArrowButton label="Dados" onClick={() => navigate('/dashboard')} />
        </div>
      ) : null}
      {metrics ? <StatsRow m={metrics} /> : null}

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
                <SortHead label="Nome" sortKey="name" sort={trailSort} onSort={setTrailSort} />
                <th>Instituição</th>
                <SortHead label="Matéria" sortKey="subject" sort={trailSort} onSort={setTrailSort} />
                <SortHead label="Ativa" sortKey="active" sort={trailSort} onSort={setTrailSort} />
                <SortHead label="Criada em" sortKey="created" sort={trailSort} onSort={setTrailSort} />
                <th />
              </tr>
            </thead>
            <tbody>
              {trailPager.slice.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link to={`/trilhas/${t.id}`} style={{ color: 'var(--v-ink)', fontWeight: 700 }}>
                      {t.name || t.id}
                    </Link>
                  </td>
                  <td>{g.institutionName(t.institution_id)}</td>
                  <td>{na(t.subject)}</td>
                  <td>
                    <span className={activePillClass(t.active)}>{t.active ? 'Sim' : 'Não'}</span>
                  </td>
                  <td>{fmtDate(t.created_at)}</td>
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
                  <td colSpan={6} className="gx-table__empty">
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

      <ConfirmDialog
        open={confirm}
        title="Deseja mesmo alterar o cadastro?"
        confirmLabel="Alterar"
        busy={saving}
        onCancel={() => setConfirm(false)}
        onConfirm={() => void save()}
      />
    </div>
  )
}

export function HomePage() {
  const g = useGestao()
  const students = useCollection('students', snapshotToStudent)
  const trails = useCollection('trails', snapshotToTrail)
  const links = useCollection('student_trails', snapshotToStudentTrail)
  const questions = useCollection('trail_stage_questions', snapshotToTrailStageQuestion)
  const attempts = useCollection('exercise_attempts', snapshotToExerciseAttempt)
  /** answerMap por instituição (dashboard_summary) — fonte densa do acerto. */
  const [answerMaps, setAnswerMaps] = useState<Map<string, Map<string, string>>>(
    () => new Map(),
  )
  const [answerMapsReady, setAnswerMapsReady] = useState(false)

  const instIdsKey = useMemo(
    () => g.institutions.map((i) => i.id).sort().join('|'),
    [g.institutions],
  )

  useEffect(() => {
    let cancelled = false
    const ids = g.institutions.map((i) => i.id).filter(Boolean)
    if (ids.length === 0) {
      setAnswerMaps(new Map())
      setAnswerMapsReady(true)
      return
    }
    setAnswerMapsReady(false)
    void (async () => {
      const next = new Map<string, Map<string, string>>()
      await Promise.all(
        ids.map(async (id) => {
          try {
            const summary = await fetchDashboardLogSummary(id, 0)
            if (!cancelled) next.set(id, summary.answerMap)
          } catch {
            if (!cancelled) next.set(id, new Map())
          }
        }),
      )
      if (cancelled) return
      setAnswerMaps(next)
      setAnswerMapsReady(true)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- instIdsKey
  }, [instIdsKey])

  const ready =
    students.ready &&
    trails.ready &&
    links.ready &&
    questions.ready &&
    attempts.ready &&
    answerMapsReady
  const error = students.error ?? trails.error ?? links.error ?? questions.error ?? attempts.error

  const metrics = useMemo(() => {
    const totals = activityCountByTrail(questions.rows)
    const catalogs = activityKeysByTrail(questions.rows)
    const map = new Map<string, InstitutionMetrics>()
    for (const inst of g.institutions) {
      map.set(
        inst.id,
        institutionMetrics({
          institutionId: inst.id,
          students: students.rows,
          trails: trails.rows,
          studentTrails: links.rows,
          activityTotals: totals,
          activityCatalogs: catalogs,
          attempts: attempts.rows,
          answerMap: answerMaps.get(inst.id),
          questions: questions.rows,
        }),
      )
    }
    return map
  }, [
    g.institutions,
    students.rows,
    trails.rows,
    links.rows,
    questions.rows,
    attempts.rows,
    answerMaps,
  ])

  if (!ready || g.institutionsLoading) return <BootSymbol />

  const mine = g.myInstitutionId
    ? g.institutions.find((i) => i.id === g.myInstitutionId)
    : undefined

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
        <SuperHome metrics={metrics} />
      ) : (
        <SchoolHome
          institution={mine}
          metrics={metrics.get(mine.id)}
          trails={trails.rows.filter((t) => t.institution_id === mine.id)}
          students={students.rows.filter((s) => s.institution_id === mine.id)}
          studentTrails={links.rows.filter((l) => l.institution_id === mine.id)}
        />
      )}
    </>
  )
}
