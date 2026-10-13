import { Link } from 'react-router-dom'
import type { StudentsListPageViewProps } from '../types/studentsListPageView'

export type {
  StudentsListInstitutionOption,
  StudentsListRow,
  StudentsListPageViewProps,
} from '../types/studentsListPageView'

export function StudentsListPageView({
  canCreate,
  institutionOptions,
  selectedInstitutionId,
  onSelectInstitution,
  search,
  onSearchChange,
  rows,
  loading,
  error,
  filteredCount,
  page,
  totalPages,
  pageStart,
  pageEnd,
  onPreviousPage,
  onNextPage,
}: StudentsListPageViewProps) {
  return (
    <>
      <header className="admin__header">
        <h1>Alunos</h1>
        <p className="admin__lede muted">
          Lista de alunos das instituições permitidas. Use o filtro para
          restringir por instituição.
        </p>
        <p className="admin__actions">
          {canCreate ? (
            <Link className="btn btn--primary" to="/alunos/novo">
              + Novo aluno
            </Link>
          ) : null}
        </p>
        <div className="list-toolbar">
          <label className="list-toolbar__field">
            <span className="muted">Instituição</span>
            <select
              value={selectedInstitutionId}
              onChange={(e) => onSelectInstitution(e.target.value)}
            >
              <option value="">Todas as instituições</option>
              {institutionOptions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.label}
                </option>
              ))}
            </select>
          </label>
          <label className="list-toolbar__field list-toolbar__field--grow">
            <span className="muted">Buscar</span>
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Nome, telefone ou ID"
            />
          </label>
        </div>
      </header>

      {error ? (
        <p className="banner banner--error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="panel">
        <div className="panel__head">
          <h2>Todos os alunos</h2>
          {loading ? (
            <span className="muted">Carregando…</span>
          ) : (
            <span className="muted">
              {filteredCount} resultado{filteredCount === 1 ? '' : 's'}
            </span>
          )}
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Instituição</th>
                <th>Telefone</th>
                <th>Nível / série</th>
                <th>Nível pedagógico</th>
                <th>Ativo</th>
                <th>Criado em</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading ? (
                <tr>
                  <td colSpan={8} className="muted table__empty">
                    Nenhum aluno encontrado.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link className="table__name-link" to={row.detailHref}>
                        {row.name || '—'}
                      </Link>
                    </td>
                    <td>{row.institutionName}</td>
                    <td>{row.phone || '—'}</td>
                    <td>
                      {row.schoolLevel || '—'}
                      {row.schoolGrade ? ` · ${row.schoolGrade}` : ''}
                    </td>
                    <td>{row.studentLevel}</td>
                    <td>{row.activeLabel}</td>
                    <td>{row.createdAtLabel}</td>
                    <td className="table__actions">
                      <Link
                        className="btn btn--small btn--ghost"
                        to={row.detailHref}
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filteredCount > 0 ? (
          <div className="list-pagination">
            <span className="muted">
              {pageStart}–{pageEnd} de {filteredCount}
            </span>
            <div className="list-pagination__actions">
              <button
                type="button"
                className="btn btn--small btn--ghost"
                onClick={onPreviousPage}
                disabled={page <= 1}
              >
                Anterior
              </button>
              <span className="muted">
                Página {page} / {totalPages}
              </span>
              <button
                type="button"
                className="btn btn--small btn--ghost"
                onClick={onNextPage}
                disabled={page >= totalPages}
              >
                Próxima
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </>
  )
}
