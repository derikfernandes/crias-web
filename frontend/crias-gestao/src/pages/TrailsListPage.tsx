import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fmtDate, activePillClass } from '../lib/gestaoFormat'
import { snapshotToTrail } from '../lib/trailFirestore'
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
  const [picked, setPicked] = useState<Set<string> | null>(null)
  const [pickedSubjects, setPickedSubjects] = useState<Set<string> | null>(null)
  const [sort, setSort] = useState<SortState | null>({ key: 'name', dir: 'asc' })

  const scoped = useMemo(
    () => trails.rows.filter((t) => g.scopedIds.has(t.institution_id)),
    [trails.rows, g.scopedIds],
  )
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
        scoped.filter((t) => selected.has(t.id) && subjectOk(t)),
        sort,
        (t, k) =>
          k === 'name'
            ? t.name
            : k === 'inst'
              ? g.institutionName(t.institution_id)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scoped, selected, selectedSubjects, sort, g],
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
          <div className="gx-filters" role="group" aria-label="Filtros">
            <span className="gx-filters__label">Filtros</span>
            <div className="gx-filters__item">
              <FilterPopover
                variant="field"
                align="left"
                label="Filtrar trilhas"
                options={scoped.map((t) => ({ id: t.id, name: t.name || t.id }))}
                selected={selected}
                onChange={(n) => {
                  setPicked(n)
                  pager.reset()
                }}
                emptyText="Nenhuma trilha encontrada."
              />
            </div>
            <div className="gx-filters__item">
              <FilterPopover
                variant="field"
                align="left"
                label="Filtrar matérias"
                options={subjects.map((x) => ({ id: x, name: x }))}
                selected={selectedSubjects}
                onChange={(n) => {
                  setPickedSubjects(n)
                  pager.reset()
                }}
                emptyText="Nenhuma matéria encontrada."
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
                <SortHead label="Nome" sortKey="name" sort={sort} onSort={setSort} />
                {multi ? <SortHead label="Instituição" sortKey="inst" sort={sort} onSort={setSort} /> : null}
                <SortHead label="Matéria" sortKey="subject" sort={sort} onSort={setSort} />
                <SortHead label="Ativa" sortKey="active" sort={sort} onSort={setSort} />
                <SortHead label="Criada em" sortKey="created" sort={sort} onSort={setSort} />
                <th />
              </tr>
            </thead>
            <tbody>
              {pager.slice.map((t) => (
                <tr key={t.id}>
                  <td>
                    <strong>{t.name || t.id}</strong>
                  </td>
                  {multi ? <td>{g.institutionName(t.institution_id)}</td> : null}
                  <td>{na(t.subject)}</td>
                  <td>
                    <span className={activePillClass(t.active)}>{t.active ? 'Sim' : 'Não'}</span>
                  </td>
                  <td>{fmtDate(t.created_at)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <Link to={`/trilhas/${t.id}`} className="gx-btn gx-btn--open">
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
              {pager.total === 0 ? (
                <tr>
                  <td colSpan={multi ? 6 : 5} className="gx-table__empty">
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
