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

  const rows = useMemo(
    () =>
      sortRows(
        scoped.filter((t) => selected.has(t.id)),
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
    [scoped, selected, sort, g],
  )
  const pager = usePager(rows, 5)

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
          <div style={{ flex: '0 1 max(calc(50% - 6px), min(100%, 360px))', minWidth: 0, marginTop: 32 }}>
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
                <SortHead label="Instituição" sortKey="inst" sort={sort} onSort={setSort} />
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
              {pager.total === 0 ? (
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
          <Pager pager={pager} noun="trilha" nounPlural="trilhas" sizes={[5, 10, 30, 50]} gateAt={10} />
        </div>
      </section>
    </div>
  )
}
