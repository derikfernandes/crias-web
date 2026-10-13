import { Link } from 'react-router-dom'
import type { GerenciamentoPageViewProps } from '../types/gerenciamentoPageView'

export type {
  GerenciamentoInstitutionOption,
  GerenciamentoTrailOption,
  GerenciamentoTrailRow,
  GerenciamentoStudentRow,
  GerenciamentoPageViewProps,
} from '../types/gerenciamentoPageView'

export function GerenciamentoPageView({
  loadingInst,
  institutionOptions,
  selectedId,
  onSelectInstitution,
  trailOptions,
  selectedTrailId,
  onSelectTrail,
  loadingTrails,
  instError,
  selectedInstitutionName,
  selectedInstitutionType,
  selectedInstitutionActiveLabel,
  selectedInstitutionCreatedAtLabel,
  selectedInstitutionUpdatedAtLabel,
  institutionDetailHref,
  newTrailHref,
  trailsError,
  trailRows,
  onDeleteTrail,
  loadingStudents,
  loadingStudentTrails,
  studentsError,
  studentTrailsError,
  studentRows,
  studentsEmptyMessage,
  studentSearch,
  onStudentSearchChange,
  filteredStudentsCount,
  totalStudentsCount,
  studentsPage,
  studentsTotalPages,
  studentsPageStart,
  studentsPageEnd,
  onPreviousStudentsPage,
  onNextStudentsPage,
}: GerenciamentoPageViewProps) {
  return (
    <>
      <header className="admin__header">
        <h1>Visão por instituição</h1>
        <p className="admin__lede muted">
          Escolha uma instituição para ver todos os alunos e todas as trilhas
          vinculados a ela.
        </p>
        <div className="gerenciamento-toolbar">
          <Link className="btn btn--ghost" to="/">
            ← Instituições
          </Link>
          <label className="gerenciamento-select">
            <span className="muted">Instituição</span>
            <select
              value={selectedId ?? ''}
              onChange={(e) => {
                const next = e.target.value.trim()
                onSelectInstitution(next || null)
              }}
              disabled={loadingInst || institutionOptions.length === 0}
            >
              <option value="">
                {loadingInst ? 'Carregando instituições…' : 'Selecione uma instituição'}
              </option>
              {institutionOptions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.label}
                </option>
              ))}
            </select>
          </label>
          <label className="gerenciamento-select">
            <span className="muted">Trilha</span>
            <select
              value={selectedTrailId ?? ''}
              onChange={(e) => {
                const next = e.target.value.trim()
                onSelectTrail(next || null)
              }}
              disabled={!selectedId || loadingTrails || trailOptions.length === 0}
            >
              <option value="">
                {!selectedId
                  ? 'Escolha a instituição primeiro'
                  : loadingTrails
                    ? 'Carregando trilhas…'
                    : 'Todas as trilhas'}
              </option>
              {trailOptions.map((trail) => (
                <option key={trail.id} value={trail.id}>
                  {trail.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {instError ? (
        <p className="banner banner--error" role="alert">
          {instError}
        </p>
      ) : null}

      {!selectedId ? (
        <section className="panel">
          <p className="muted gerenciamento-placeholder">
            Selecione uma instituição para ver os detalhes e as listas de alunos e
            trilhas.
          </p>
        </section>
      ) : (
        <>
          <div className="gerenciamento-layout">
            <section className="panel">
              <div className="panel__head">
                <h2>
                  {selectedInstitutionName}{' '}
                  <span className="muted gerenciamento-id">({selectedId})</span>
                </h2>
                <p className="admin__actions gerenciamento-detail-actions">
                  <Link
                    className="btn btn--small btn--ghost"
                    to={institutionDetailHref}
                  >
                    Abrir cadastro
                  </Link>
                </p>
              </div>
              <dl className="gerenciamento-details">
                <div className="gerenciamento-details__row">
                  <dt>Tipo</dt>
                  <dd>{selectedInstitutionType}</dd>
                </div>
                <div className="gerenciamento-details__row">
                  <dt>Ativa</dt>
                  <dd>{selectedInstitutionActiveLabel}</dd>
                </div>
                <div className="gerenciamento-details__row">
                  <dt>Criada em</dt>
                  <dd>{selectedInstitutionCreatedAtLabel}</dd>
                </div>
                <div className="gerenciamento-details__row">
                  <dt>Atualizada em</dt>
                  <dd>{selectedInstitutionUpdatedAtLabel}</dd>
                </div>
              </dl>
            </section>

            <section className="panel">
              <div className="panel__head">
                <h2>Trilhas</h2>
                <p className="admin__actions gerenciamento-detail-actions">
                  {loadingTrails ? <span className="muted">Carregando…</span> : null}
                  <Link className="btn btn--small btn--primary" to={newTrailHref}>
                    Criar Trilha
                  </Link>
                </p>
              </div>
              {trailsError ? (
                <p className="banner banner--error" role="alert">
                  {trailsError}
                </p>
              ) : null}
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Disciplina</th>
                      <th>Ativa</th>
                      <th>Atualizada</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingTrails ? (
                      <tr>
                        <td colSpan={5} className="muted table__empty">
                          Carregando trilhas…
                        </td>
                      </tr>
                    ) : trailRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="muted table__empty">
                          Nenhuma trilha nesta instituição.
                        </td>
                      </tr>
                    ) : (
                      trailRows.map((t) => (
                        <tr key={t.id}>
                          <td>
                            <Link className="table__name-link" to={t.detailHref}>
                              {t.name}
                            </Link>
                          </td>
                          <td>{t.subject}</td>
                          <td>{t.activeLabel}</td>
                          <td>{t.updatedAtLabel}</td>
                          <td className="table__actions">
                            <Link className="btn btn--small btn--ghost" to={t.detailHref}>
                              Abrir
                            </Link>
                            <button
                              type="button"
                              className="btn btn--small btn--danger"
                              onClick={() => onDeleteTrail(t.id)}
                              disabled={t.deleting}
                            >
                              {t.deleting ? 'Excluindo…' : 'Excluir'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <div className="gerenciamento-bottom">
            <section className="panel">
              <div className="panel__head">
                <h2>Alunos</h2>
                {loadingStudents || loadingStudentTrails ? (
                  <span className="muted">Carregando…</span>
                ) : null}
              </div>
              {studentsError ? (
                <p className="banner banner--error" role="alert">
                  {studentsError}
                </p>
              ) : null}
              {studentTrailsError ? (
                <p className="banner banner--error" role="alert">
                  {studentTrailsError}
                </p>
              ) : null}
              {!loadingStudents &&
              !loadingStudentTrails &&
              totalStudentsCount > 0 ? (
                <div className="trail-students-filter">
                  <label className="trail-bulk-edit__field trail-students-search">
                    <span className="muted">Pesquisar aluno</span>
                    <input
                      id="gerenciamento-students-search"
                      type="search"
                      autoComplete="off"
                      placeholder="Nome ou número"
                      value={studentSearch}
                      onChange={(e) => onStudentSearchChange(e.target.value)}
                    />
                  </label>
                  <span className="muted trail-students-filter__count">
                    {filteredStudentsCount} de {totalStudentsCount} aluno(s)
                  </span>
                </div>
              ) : null}
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nome</th>
                      <th>Trilha atual</th>
                      <th>Stage</th>
                      <th>Questão</th>
                      <th>Status</th>
                      <th>Telefone</th>
                      <th>Escolaridade</th>
                      <th>Nível pedagógico</th>
                      <th>Ativo</th>
                      <th>Criado em</th>
                      <th>Atualizado em</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingStudents || loadingStudentTrails ? (
                      <tr>
                        <td colSpan={13} className="muted table__empty">
                          Carregando alunos…
                        </td>
                      </tr>
                    ) : filteredStudentsCount === 0 ? (
                      <tr>
                        <td colSpan={13} className="muted table__empty">
                          {studentSearch
                            ? 'Nenhum aluno corresponde à pesquisa.'
                            : studentsEmptyMessage}
                        </td>
                      </tr>
                    ) : (
                      studentRows.map((s) => (
                        <tr key={s.id}>
                          <td>
                            <code>{s.id}</code>
                          </td>
                          <td>
                            <Link className="table__name-link" to={s.detailHref}>
                              {s.name}
                            </Link>
                          </td>
                          <td>{s.trailLabel}</td>
                          <td>{s.stageLabel}</td>
                          <td>{s.questionLabel}</td>
                          <td>
                            {s.statusLabel === '—' ? (
                              '—'
                            ) : (
                              <code>{s.statusLabel}</code>
                            )}
                          </td>
                          <td>{s.phone}</td>
                          <td>{s.schoolLabel}</td>
                          <td>{s.studentLevel}</td>
                          <td>{s.activeLabel}</td>
                          <td>{s.createdAtLabel}</td>
                          <td>{s.updatedAtLabel}</td>
                          <td className="table__actions">
                            <Link className="btn btn--small btn--ghost" to={s.detailHref}>
                              Abrir
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {!loadingStudents &&
              !loadingStudentTrails &&
              filteredStudentsCount > 0 ? (
                <div className="trail-students-pagination">
                  <span className="muted">
                    Exibindo {studentsPageStart}–{studentsPageEnd} de{' '}
                    {filteredStudentsCount}
                  </span>
                  <div className="trail-students-pagination__actions">
                    <button
                      type="button"
                      className="btn btn--ghost btn--small"
                      disabled={studentsPage === 1}
                      onClick={onPreviousStudentsPage}
                    >
                      Anterior
                    </button>
                    <span className="muted">
                      Página {studentsPage} de {studentsTotalPages}
                    </span>
                    <button
                      type="button"
                      className="btn btn--ghost btn--small"
                      disabled={studentsPage === studentsTotalPages}
                      onClick={onNextStudentsPage}
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        </>
      )}
    </>
  )
}
