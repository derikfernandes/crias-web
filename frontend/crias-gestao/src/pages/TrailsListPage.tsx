import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fmtDate, activePillClass } from '../lib/gestaoFormat'
import { snapshotToTrail } from '../lib/trailFirestore'
import { snapshotToStudent } from '../lib/studentFirestore'
import { snapshotToStudentTrail } from '../lib/studentTrailFirestore'
import { joinList, scopeOf, sortTurmas, trailInScope, turmasByTrail } from '../lib/turmas'
import { useCollection } from '../hooks/useCollection'
import { useGestao } from '../hooks/useGestao'
import { usePermissions } from '../hooks/usePermissions'
import {
  Banner,
  BootSymbol,
  FilterPopover,
  na,
  PageHead,
  Pager,
  ScrollX,
  SortHead,
  sortRows,
  usePager,
  type SortState,
} from '../design/gx/ui'

/** Lista de trilhas (1.1.12): filtro de trilhas na linha fixa, tabela ordenável e 5 por página. */
export function TrailsListPage() {
  const g = useGestao()
  const navigate = useNavigate()
  const { canNav } = usePermissions()
  const trails = useCollection('trails', snapshotToTrail)
  const students = useCollection('students', snapshotToStudent)
  const links = useCollection('student_trails', snapshotToStudentTrail)
  const { adminProfile } = usePermissions()
  const [picked, setPicked] = useState<Set<string> | null>(null)
  const [pickedSubjects, setPickedSubjects] = useState<Set<string> | null>(null)
  const [pickedTurmas, setPickedTurmas] = useState<Set<string> | null>(null)
  const [sort, setSort] = useState<SortState | null>({ key: 'name', dir: 'asc' })

  // 1.3.18: o Professor só vê trilhas das matérias dele (o servidor também filtra, CONFLITO 1.3.E.3).
  const scope = scopeOf(adminProfile)
  const scoped = useMemo(
    () => trails.rows.filter((t) => g.scopedIds.has(t.institution_id) && trailInScope(scope, t)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trails.rows, g.scopedIds, adminProfile],
  )
  /** 1.3.8: turma da trilha = turmas dos alunos vinculados. */
  const turmasTrail = useMemo(() => turmasByTrail(links.rows, students.rows), [links.rows, students.rows])
  const turmaList = useMemo(() => sortTurmas(scoped.flatMap((t) => turmasTrail.get(t.id) ?? [])), [scoped, turmasTrail])
  const selectedTurmas = useMemo(() => {
    if (!pickedTurmas) return new Set(turmaList)
    return new Set([...pickedTurmas].filter((x) => turmaList.includes(x)))
  }, [turmaList, pickedTurmas])
  // Trilha sem turma só some se a pessoa tirar alguma turma da lista.
  const turmaOk = (t: { id: string }) => {
    if (!pickedTurmas) return true
    const list = turmasTrail.get(t.id) ?? []
    if (list.length === 0) return selectedTurmas.size === turmaList.length
    return list.some((x) => selectedTurmas.has(x))
  }
  const selected = useMemo(() => {
    const ids = new Set(scoped.map((t) => t.id))
    if (!picked) return ids
    const out = new Set<string>()
    for (const id of picked) if (ids.has(id)) out.add(id)
    return out
  }, [scoped, picked])

  const subjects = useMemo(
    () => [...new Set(scoped.map((t) => t.subject.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [scoped],
  )
  const selectedSubjects = useMemo(() => {
    if (!pickedSubjects) return new Set(subjects)
    return new Set([...pickedSubjects].filter((x) => subjects.includes(x)))
  }, [subjects, pickedSubjects])
  // Trilha sem matéria só some se a pessoa tirar alguma matéria da lista.
  const subjectOk = (t: { subject: string }) => !t.subject.trim() || selectedSubjects.has(t.subject.trim())

  const rows = useMemo(
    () =>
      sortRows(
        scoped.filter((t) => selected.has(t.id) && subjectOk(t) && turmaOk(t)),
        sort,
        (t, k) =>
          k === 'name'
            ? t.name
            : k === 'inst'
              ? g.institutionName(t.institution_id)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scoped, selected, selectedSubjects, selectedTurmas, pickedTurmas, turmasTrail, sort, g],
  )
  const pager = usePager(rows, 5)

  const multi = g.scopedInstitutions.length > 1
  const creatable = g.scopedInstitutions.length === 1 ? g.scopedInstitutions[0] : null

  if (!trails.ready || g.institutionsLoading) return <BootSymbol />

  return (
    <div className="gx-page">
      <PageHead
        title="Trilhas"
        subtitle="Gestão de trilhas de conteúdos e exercícios."
        actions={
          canNav('trail_new') ? (
            <button
              type="button"
              className="gx-btn gx-btn--primary"
              disabled={!creatable}
              title={creatable ? undefined : 'Selecione uma instituição para criar a trilha.'}
              onClick={() => creatable && navigate(`/trilhas/novo?institution=${encodeURIComponent(creatable.id)}`)}
            >
              + Nova trilha
            </button>
          ) : null
        }
        tools={
          // 1.3.9: Filtrar matéria, Filtrar turma, Filtrar trilhas, nessa ordem.
          <div className="gx-filters" role="group" aria-label="Filtros">
            <span className="gx-filters__label">Filtros</span>
            <div className="gx-filters__item">
              <FilterPopover
                variant="field"
                align="left"
                label="Filtrar matéria"
                options={subjects.map((x) => ({ id: x, name: x }))}
                selected={selectedSubjects}
                onChange={(n) => {
                  setPickedSubjects(n)
                  pager.reset()
                }}
                emptyText="Nenhuma matéria encontrada."
              />
            </div>
            <div className="gx-filters__item">
              <FilterPopover
                variant="field"
                align="left"
                label="Filtrar turma"
                options={turmaList.map((x) => ({ id: x, name: x }))}
                selected={selectedTurmas}
                onChange={(n) => {
                  setPickedTurmas(n)
                  pager.reset()
                }}
                emptyText="Nenhuma turma encontrada."
              />
            </div>
            <div className="gx-filters__item">
              <FilterPopover
                variant="field"
                align="left"
                label="Filtrar trilhas"
                options={scoped.filter(subjectOk).map((t) => ({ id: t.id, name: t.name || t.id }))}
                selected={selected}
                onChange={(n) => {
                  setPicked(n)
                  pager.reset()
                }}
                emptyText="Nenhuma trilha encontrada."
              />
            </div>
          </div>
        }
      />
      {trails.error ? (
        <Banner onRetry={trails.retry}>Não foi possível carregar os dados. Tente atualizar a página.</Banner>
      ) : null}
      {!creatable && canNav('trail_new') ? (
        <p className="gx-muted">Selecione uma instituição para criar a trilha.</p>
      ) : null}
      <section className="gx-card" style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
        <ScrollX>
          <table className="gx-table">
            <thead>
              <tr>
                {multi ? <SortHead label="Instituição" sortKey="inst" sort={sort} onSort={setSort} /> : null}
                <SortHead label="Matéria" sortKey="subject" sort={sort} onSort={setSort} />
                <SortHead label="Turma" sortKey="turma" sort={sort} onSort={setSort} />
                <SortHead label="Trilha" sortKey="name" sort={sort} onSort={setSort} />
                <SortHead label="Criada em" sortKey="created" sort={sort} onSort={setSort} />
                <SortHead label="Ativa" sortKey="active" sort={sort} onSort={setSort} />
                <th />
              </tr>
            </thead>
            <tbody>
              {pager.slice.map((t) => (
                <tr key={t.id}>
                  {multi ? <td>{g.institutionName(t.institution_id)}</td> : null}
                  <td>{na(t.subject)}</td>
                  <td>{joinList(turmasTrail.get(t.id))}</td>
                  <td>
                    <strong>{t.name || t.id}</strong>
                  </td>
                  <td>{fmtDate(t.created_at)}</td>
                  <td>
                    <span className={activePillClass(t.active)}>{t.active ? 'Sim' : 'Não'}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Link to={`/trilhas/${t.id}`} className="gx-btn gx-btn--open">
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
              {pager.total === 0 ? (
                <tr>
                  <td colSpan={multi ? 7 : 6} className="gx-table__empty">
                    Nenhuma trilha encontrada.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </ScrollX>
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--v-soft2)' }}>
          <Pager pager={pager} noun="trilha" nounPlural="trilhas" sizes={[5, 10, 30, 50]} gateAt={10} />
        </div>
      </section>
    </div>
  )
}
