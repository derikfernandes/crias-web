import { Link } from 'react-router-dom'
import type { StudentsListPageViewProps } from '../types/studentsListPageView'
import { StatusTag } from '../components/ui/StatusTag'
import { PageEmpty, PageError, PageLoading } from '../components/feedback/PageState'

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
  trailOptions,
  selectedTrailId = '',
  onSelectTrail,
  gradeOptions,
  selectedGrade = '',
  onSelectGrade,
  situationFilterOptions,
  selectedSituation = '',
  onSelectSituation,
  selectedCount = 0,
  onToggleRowSelected,
  onToggleSelectAll,
  allPageSelected = false,
  onBulkDeactivate,
  onBulkExport,
  onBulkLink,
  bulkLinkTrailOptions,
  bulkLinkTrailId = '',
  onBulkLinkTrailIdChange,
  bulkBusy = false,
  canImport = false,
  onImportClick,
}: StudentsListPageViewProps) {
  const showBulk = Boolean(onToggleRowSelected)

  return (
    <>
      <header className="admin__header">
        <h1>Alunos</h1>
        <p className="admin__lede muted">
          Busque, filtre por situação e abra o perfil. Ações em massa só
          aparecem quando disponíveis.
        </p>
        <p className="admin__actions">
          {canCreate ? (
            <Link className="btn btn--primary" to="/alunos/novo">
              + Adicionar aluno
            </Link>
          ) : null}
          {canImport && onImportClick ? (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={onImportClick}
            >
              Importar
            </button>
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
          {trailOptions && onSelectTrail ? (
            <label className="list-toolbar__field">
              <span className="muted">Trilha</span>
              <select
                value={selectedTrailId}
                onChange={(e) => onSelectTrail(e.target.value)}
              >
                <option value="">Todas</option>
                {trailOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {gradeOptions && gradeOptions.length > 0 && onSelectGrade ? (
            <label className="list-toolbar__field">
              <span className="muted">Série</span>
              <select
                value={selectedGrade}
                onChange={(e) => onSelectGrade(e.target.value)}
              >
                <option value="">Todas</option>
                {gradeOptions.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {situationFilterOptions && onSelectSituation ? (
            <label className="list-toolbar__field">
              <span className="muted">Situação</span>
              <select
                value={selectedSituation}
                onChange={(e) => onSelectSituation(e.target.value)}
              >
                <option value="">Todas</option>
                {situationFilterOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
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
        {showBulk && selectedCount > 0 ? (
          <p className="admin__actions" style={{ flexWrap: 'wrap' }}>
            <span className="muted">{selectedCount} selecionado(s)</span>
            {onBulkExport ? (
              <button
                type="button"
                className="btn btn--ghost btn--small"
                disabled={bulkBusy}
                onClick={onBulkExport}
              >
                Exportar CSV
              </button>
            ) : null}
            {onBulkLink &&
            bulkLinkTrailOptions &&
            onBulkLinkTrailIdChange ? (
              <>
                <label className="list-toolbar__field">
                  <span className="muted">Vincular à trilha</span>
                  <select
                    value={bulkLinkTrailId}
                    onChange={(e) => onBulkLinkTrailIdChange(e.target.value)}
                    disabled={bulkBusy}
                  >
                    <option value="">Selecione…</option>
                    {bulkLinkTrailOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="btn btn--ghost btn--small"
                  disabled={bulkBusy || !bulkLinkTrailId}
                  onClick={onBulkLink}
                >
                  Vincular selecionados
                </button>
              </>
            ) : null}
            {onBulkDeactivate ? (
              <button
                type="button"
                className="btn btn--ghost btn--small"
                disabled={bulkBusy}
                onClick={onBulkDeactivate}
              >
                Desativar selecionados
              </button>
            ) : null}
          </p>
        ) : null}
      </header>

      {error ? (
        <PageError title="Erro ao carregar alunos" body={error} />
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

        {loading && rows.length === 0 ? (
          <PageLoading label="Carregando alunos…" />
        ) : !loading && rows.length === 0 ? (
          <PageEmpty
            title="Nenhum aluno encontrado"
            body="Ajuste os filtros ou cadastre um novo aluno."
          />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    {showBulk ? (
                      <th className="table__checkbox-cell">
                        <input
                          type="checkbox"
                          checked={allPageSelected}
                          onChange={onToggleSelectAll}
                          aria-label="Selecionar página"
                        />
                      </th>
                    ) : null}
                    <th>Nome</th>
                    <th>Situação</th>
                    <th>Instituição</th>
                    <th>Série</th>
                    <th>Telefone</th>
                    <th>Nível</th>
                    <th>Ativo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      {showBulk ? (
                        <td className="table__checkbox-cell">
                          <input
                            type="checkbox"
                            checked={Boolean(row.selected)}
                            onChange={() => onToggleRowSelected?.(row.id)}
                            aria-label={`Selecionar ${row.name}`}
                          />
                        </td>
                      ) : null}
                      <td>
                        <Link className="table__name-link" to={row.detailHref}>
                          {row.name || '—'}
                        </Link>
                      </td>
                      <td>
                        <StatusTag
                          label={row.situationLabel}
                          tone={row.situationTone}
                        />
                      </td>
                      <td>{row.institutionName}</td>
                      <td>
                        {row.schoolGrade || row.schoolLevel
                          ? [row.schoolGrade, row.schoolLevel]
                              .filter(Boolean)
                              .join(' · ')
                          : '—'}
                      </td>
                      <td>{row.phone || '—'}</td>
                      <td>{row.studentLevel}</td>
                      <td>{row.activeLabel}</td>
                      <td className="table__actions">
                        <Link
                          className="btn btn--small btn--ghost"
                          to={row.detailHref}
                        >
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  ))}
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
          </>
        )}
      </section>
    </>
  )
}
