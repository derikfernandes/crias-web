import { Link } from 'react-router-dom'
import type { TrailDetailPageViewProps } from '../types/trailDetailPageView'

export type {
  TrailDetailCadastroSummary,
  TrailDetailEligibleStudent,
  TrailDetailStudentTrailRow,
  TrailDetailPageViewProps,
} from '../types/trailDetailPageView'

export function TrailDetailPageView(props: TrailDetailPageViewProps) {
  if (props.status === 'missing-id') {
    return (
      <p className="banner banner--error" role="alert">
        ID ausente na URL.
      </p>
    )
  }

  const {
    error,
    loading,
    notFound,
    activeTab,
    onActiveTabChange,
    institutionLabel,
    showTrailForm,
    onToggleTrailForm,
    cadastro,
    editFormSlot,
    loadingStages,
    stagesError,
    structureError,
    structureEditorSlot,
    loadingStageQuestions,
    stageQuestionsError,
    contentEditorSlot,
    desempenhoSummary,
    loadingStudentTrails,
    canExportXlsx,
    onExportXlsx,
    showBulkEditor,
    canToggleBulkEditor,
    onToggleBulkEditor,
    showAddStudentPicker,
    canAddStudent,
    onToggleAddStudentPicker,
    missingInstitution,
    institutionStudentsError,
    loadingInstitutionStudents,
    studentPickerFilter,
    onStudentPickerFilterChange,
    addStudentError,
    institutionStudentsCount,
    eligibleStudentsCount,
    filteredEligibleStudents,
    canMutateStudents,
    addingStudentId,
    onAddStudent,
    bulkStage,
    onBulkStageChange,
    bulkQuestion,
    onBulkQuestionChange,
    stageOptions,
    questionOptions,
    bulkBusy,
    selectedCount,
    canApplyBulk,
    onApplyBulk,
    bulkError,
    bulkSuccess,
    studentTrailsError,
    hasStudentTrails,
    totalStudentTrailsCount,
    studentSearch,
    onStudentSearchChange,
    filterStage,
    onFilterStageChange,
    filterQuestion,
    onFilterQuestionChange,
    onClearFilters,
    filteredStudentTrailsCount,
    studentTrailRows,
    studentTrailsPage,
    studentTrailsTotalPages,
    studentTrailsPageStart,
    studentTrailsPageEnd,
    onPreviousStudentTrailsPage,
    onNextStudentTrailsPage,
    allStudentTrailsSelected,
    onToggleSelectAllStudentTrails,
    onToggleStudentTrailSelection,
  } = props

  return (
    <>
      <header className="admin__header">
        <h1>{cadastro?.name || 'Trilha'}</h1>
        <p className="admin__lede muted">
          {cadastro
            ? `${cadastro.subject || 'Sem matéria'} · ${cadastro.activeLabel}`
            : 'Editor da trilha'}
        </p>
        <p className="admin__actions trail-header-actions">
          <Link className="btn btn--ghost" to="/trilhas">
            ← Trilhas
          </Link>
          <label className="trail-header-select">
            <span className="muted">Instituição</span>
            <input value={institutionLabel} readOnly disabled />
          </label>
        </p>
      </header>

      {error ? (
        <p className="banner banner--error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="muted">Carregando…</p>
      ) : notFound ? (
        <p className="banner banner--error" role="alert">
          Registro não encontrado.
        </p>
      ) : (
        <>
          <nav className="crias-tabs" aria-label="Seções da trilha" role="tablist">
            {(
              [
                { id: 'geral' as const, label: 'Geral' },
                { id: 'structure' as const, label: 'Estrutura' },
                { id: 'content' as const, label: 'Atividades' },
                { id: 'desempenho' as const, label: 'Desempenho' },
                { id: 'students' as const, label: 'Alunos' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={
                  activeTab === tab.id
                    ? 'crias-tabs__btn crias-tabs__btn--active'
                    : 'crias-tabs__btn'
                }
                onClick={() => onActiveTabChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {activeTab === 'geral' ? (
            <div className="trail-tab-panel" role="tabpanel">
              <section className="panel trail-cadastro-panel">
                <div className="trail-cadastro-summary">
                  <div className="trail-cadastro-top">
                    <p className="trail-cadastro-title">
                      {cadastro?.name || 'Trilha'}{' '}
                      <span className="muted trail-cadastro-id">
                        ({cadastro?.id})
                      </span>
                    </p>
                    <button
                      type="button"
                      className="btn btn--ghost btn--small"
                      onClick={onToggleTrailForm}
                    >
                      {showTrailForm ? 'Fechar cadastro' : 'Editar cadastro'}
                    </button>
                  </div>
                  <dl className="trail-cadastro-details">
                    <div className="trail-cadastro-details__row">
                      <dt>Matéria</dt>
                      <dd>{cadastro?.subject || '—'}</dd>
                    </div>
                    <div className="trail-cadastro-details__row">
                      <dt>Descrição</dt>
                      <dd
                        className="trail-cadastro-ellipsis"
                        title={cadastro?.description || '—'}
                      >
                        {cadastro?.description || '—'}
                      </dd>
                    </div>
                    <div className="trail-cadastro-details__row">
                      <dt>Status</dt>
                      <dd>{cadastro?.activeLabel}</dd>
                    </div>
                    <div className="trail-cadastro-details__row">
                      <dt>Criada em</dt>
                      <dd>{cadastro?.createdAtLabel}</dd>
                    </div>
                    <div className="trail-cadastro-details__row">
                      <dt>Atualizada em</dt>
                      <dd>{cadastro?.updatedAtLabel}</dd>
                    </div>
                  </dl>
                </div>
              </section>
              {showTrailForm ? editFormSlot : null}
            </div>
          ) : activeTab === 'structure' ? (
            <div className="trail-tab-panel" role="tabpanel">
              <section className="panel">
                {loadingStages ? (
                  <p className="muted">Carregando estrutura…</p>
                ) : null}
                {stagesError ? (
                  <p className="banner banner--error" role="alert">
                    {stagesError}
                  </p>
                ) : null}
                {structureError ? (
                  <p className="banner banner--error" role="alert">
                    {structureError}
                  </p>
                ) : null}
                {structureEditorSlot}
              </section>
            </div>
          ) : activeTab === 'content' ? (
            <div className="trail-tab-panel" role="tabpanel">
              <section className="panel">
                {loadingStageQuestions ? (
                  <p className="muted">Carregando atividades…</p>
                ) : null}
                {stageQuestionsError ? (
                  <p className="banner banner--error" role="alert">
                    {stageQuestionsError}
                  </p>
                ) : null}
                {contentEditorSlot}
              </section>
            </div>
          ) : activeTab === 'desempenho' ? (
            <div className="trail-tab-panel" role="tabpanel">
              <section className="panel">
                <div className="panel__head">
                  <h2>Desempenho</h2>
                </div>
                {loadingStudentTrails ? (
                  <p className="muted">Carregando desempenho…</p>
                ) : desempenhoSummary && desempenhoSummary.enrolled > 0 ? (
                  <div className="crias-kpi-grid">
                    <div className="crias-kpi">
                      <span className="crias-kpi__label">Vinculados</span>
                      <span className="crias-kpi__value">
                        {desempenhoSummary.enrolled}
                      </span>
                    </div>
                    <div className="crias-kpi">
                      <span className="crias-kpi__label">Concluíram</span>
                      <span className="crias-kpi__value">
                        {desempenhoSummary.completed}
                      </span>
                    </div>
                    <div className="crias-kpi">
                      <span className="crias-kpi__label">Em andamento</span>
                      <span className="crias-kpi__value">
                        {desempenhoSummary.inProgress}
                      </span>
                    </div>
                    <div className="crias-kpi">
                      <span className="crias-kpi__label">Não iniciaram</span>
                      <span className="crias-kpi__value">
                        {desempenhoSummary.notStarted}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="muted">
                    Ainda não há alunos vinculados para montar o desempenho.
                    Use a aba Alunos para vincular.
                  </p>
                )}
              </section>
            </div>
          ) : (
            <div
              id="trail-students-panel"
              className="trail-tab-panel"
              role="tabpanel"
            >
              <section className="panel">
            <div className="panel__head">
              <h2>Alunos na trilha (student_trails)</h2>
              <div className="trail-panel-head__aside">
                {loadingStudentTrails ? (
                  <span className="muted">Carregando progresso…</span>
                ) : null}
                <button
                  type="button"
                  className="btn btn--ghost btn--small"
                  disabled={!canExportXlsx}
                  onClick={onExportXlsx}
                >
                  Exportar XLSX
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--small"
                  disabled={!canToggleBulkEditor}
                  onClick={onToggleBulkEditor}
                >
                  {showBulkEditor
                    ? 'Fechar alteração em lote'
                    : 'Alterar em lote stage e questão'}
                </button>
                <button
                  type="button"
                  className="btn btn--primary btn--small"
                  disabled={!canAddStudent}
                  onClick={onToggleAddStudentPicker}
                >
                  {showAddStudentPicker ? 'Fechar' : 'Adicionar aluno'}
                </button>
              </div>
            </div>

            {showAddStudentPicker ? (
              <div className="trail-add-students">
                {missingInstitution ? (
                  <p className="muted" role="status">
                    Defina a instituição da trilha no formulário acima para listar
                    alunos.
                  </p>
                ) : institutionStudentsError ? (
                  <p className="banner banner--error" role="alert">
                    {institutionStudentsError}
                  </p>
                ) : loadingInstitutionStudents ? (
                  <p className="muted" role="status">
                    Carregando alunos da instituição…
                  </p>
                ) : (
                  <>
                    <p className="muted" style={{ margin: '0 0 0.75rem' }}>
                      Alunos da mesma instituição da trilha que ainda não têm registro
                      em <code>student_trails</code>. A inclusão grava direto no
                      Firestore (sem API nova).
                    </p>
                    <div className="trail-add-students__filter">
                      <label className="muted" htmlFor="trail-add-student-filter">
                        Filtrar por nome ou ID
                      </label>
                      <input
                        id="trail-add-student-filter"
                        type="search"
                        autoComplete="off"
                        placeholder="Ex.: nome ou parte do ID"
                        value={studentPickerFilter}
                        onChange={(e) =>
                          onStudentPickerFilterChange(e.target.value)
                        }
                      />
                    </div>
                    {addStudentError ? (
                      <p className="banner banner--error" role="alert">
                        {addStudentError}
                      </p>
                    ) : null}
                    {eligibleStudentsCount === 0 ? (
                      <p className="muted" role="status">
                        {institutionStudentsCount === 0
                          ? 'Não há alunos cadastrados nesta instituição.'
                          : 'Todos os alunos desta instituição já estão nesta trilha.'}
                      </p>
                    ) : filteredEligibleStudents.length === 0 ? (
                      <p className="muted" role="status">
                        Nenhum aluno corresponde ao filtro.
                      </p>
                    ) : (
                      <ul className="trail-add-students__list">
                        {filteredEligibleStudents.map((s) => (
                          <li key={s.id}>
                            <div className="trail-add-students__row">
                              <span>
                                <strong>{s.name || '—'}</strong>{' '}
                                <code className="muted">{s.id}</code>
                              </span>
                              <button
                                type="button"
                                className="btn btn--small btn--ghost"
                                disabled={
                                  addingStudentId !== null || !canMutateStudents
                                }
                                onClick={() => onAddStudent(s.id)}
                              >
                                {s.isAdding
                                  ? 'Adicionando…'
                                  : 'Incluir na trilha'}
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            ) : null}

            {showBulkEditor ? (
              <div className="trail-add-students">
                <p className="muted" style={{ margin: '0 0 0.75rem' }}>
                  Use os filtros da tabela e marque os alunos desejados. Em seguida
                  escolha o stage e a questão de destino e aplique. A alteração grava
                  direto em <code>student_trails</code>.
                </p>
                <div className="trail-bulk-edit">
                  <label className="trail-bulk-edit__field">
                    <span className="muted">Stage de destino</span>
                    <select
                      value={bulkStage}
                      onChange={(e) => onBulkStageChange(e.target.value)}
                    >
                      <option value="" disabled>
                        Selecione…
                      </option>
                      {stageOptions.map((n) => (
                        <option key={n} value={String(n)}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="trail-bulk-edit__field">
                    <span className="muted">Questão de destino</span>
                    <select
                      value={bulkQuestion}
                      onChange={(e) => onBulkQuestionChange(e.target.value)}
                    >
                      <option value="" disabled>
                        Selecione…
                      </option>
                      {questionOptions.map((n) => (
                        <option key={n} value={String(n)}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="btn btn--primary btn--small"
                    disabled={!canApplyBulk}
                    onClick={onApplyBulk}
                  >
                    {bulkBusy
                      ? 'Aplicando…'
                      : `Aplicar a ${selectedCount} aluno(s)`}
                  </button>
                </div>
                {bulkError ? (
                  <p className="banner banner--error" role="alert">
                    {bulkError}
                  </p>
                ) : null}
                {bulkSuccess ? (
                  <p className="banner banner--success" role="status">
                    {bulkSuccess}
                  </p>
                ) : null}
              </div>
            ) : null}

            {studentTrailsError ? (
              <p className="banner banner--error" role="alert">
                {studentTrailsError}
              </p>
            ) : null}

            {!loadingStudentTrails && !hasStudentTrails ? (
              <p className="muted">
                Nenhum aluno com progresso registrado nesta trilha ainda. Use{' '}
                <strong>Adicionar aluno</strong> para criar o vínculo ou aguarde o
                chatbot criar/atualizar <code>student_trails</code> quando o aluno
                avançar.
              </p>
            ) : null}

            {hasStudentTrails ? (
              <>
                <div className="trail-students-filter">
                  <label className="trail-bulk-edit__field trail-students-search">
                    <span className="muted">Pesquisar aluno</span>
                    <input
                      id="trail-students-search"
                      type="search"
                      autoComplete="off"
                      placeholder="Nome ou número"
                      value={studentSearch}
                      onChange={(e) => onStudentSearchChange(e.target.value)}
                    />
                  </label>
                  <label className="trail-bulk-edit__field">
                    <span className="muted">Filtrar por stage</span>
                    <select
                      value={filterStage}
                      onChange={(e) => onFilterStageChange(e.target.value)}
                    >
                      <option value="">Todos</option>
                      {stageOptions.map((n) => (
                        <option key={n} value={String(n)}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="trail-bulk-edit__field">
                    <span className="muted">Filtrar por questão</span>
                    <select
                      value={filterQuestion}
                      onChange={(e) => onFilterQuestionChange(e.target.value)}
                    >
                      <option value="">Todas</option>
                      {questionOptions.map((n) => (
                        <option key={n} value={String(n)}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  {studentSearch || filterStage || filterQuestion ? (
                    <button
                      type="button"
                      className="btn btn--ghost btn--small"
                      onClick={onClearFilters}
                    >
                      Limpar filtro
                    </button>
                  ) : null}
                  <span className="muted trail-students-filter__count">
                    {filteredStudentTrailsCount} de {totalStudentTrailsCount}{' '}
                    aluno(s)
                  </span>
                </div>

                {filteredStudentTrailsCount === 0 ? (
                  <p className="muted" role="status">
                    Nenhum aluno corresponde ao filtro selecionado.
                  </p>
                ) : (
                  <>
                    <div className="table-wrap">
                      <table className="table">
                        <thead>
                          <tr>
                            {showBulkEditor ? (
                              <th className="table__checkbox-cell">
                                <input
                                  type="checkbox"
                                  aria-label="Selecionar todos os alunos filtrados"
                                  checked={allStudentTrailsSelected}
                                  onChange={onToggleSelectAllStudentTrails}
                                />
                              </th>
                            ) : null}
                            <th>Aluno</th>
                            <th>Stage atual</th>
                            <th>Questão atual</th>
                            <th>Status</th>
                            <th>Início</th>
                            <th>Última interação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentTrailRows.map((row) => (
                            <tr
                              key={row.id}
                              className={
                                showBulkEditor && row.selected
                                  ? 'table__row--selected'
                                  : undefined
                              }
                            >
                              {showBulkEditor ? (
                                <td className="table__checkbox-cell">
                                  <input
                                    type="checkbox"
                                    aria-label={row.selectAriaLabel}
                                    checked={row.selected}
                                    onChange={() =>
                                      onToggleStudentTrailSelection(row.id)
                                    }
                                  />
                                </td>
                              ) : null}
                              <td>
                                <Link
                                  className="table__name-link"
                                  to={row.studentHref}
                                >
                                  {row.studentName ?? (
                                    <code>{row.studentId}</code>
                                  )}
                                </Link>
                                {row.phoneLabel ? (
                                  <div className="muted table__subtext">
                                    {row.phoneLabel}
                                  </div>
                                ) : null}
                              </td>
                              <td>{row.stageDisplay}</td>
                              <td>{row.questionDisplay}</td>
                              <td>
                                <code>{row.status}</code>
                              </td>
                              <td>{row.startedAtLabel}</td>
                              <td>{row.lastInteractionAtLabel}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="trail-students-pagination">
                      <span className="muted">
                        Exibindo {studentTrailsPageStart}–{studentTrailsPageEnd} de{' '}
                        {filteredStudentTrailsCount}
                      </span>
                      <div className="trail-students-pagination__actions">
                        <button
                          type="button"
                          className="btn btn--ghost btn--small"
                          disabled={studentTrailsPage === 1}
                          onClick={onPreviousStudentTrailsPage}
                        >
                          Anterior
                        </button>
                        <span className="muted">
                          Página {studentTrailsPage} de {studentTrailsTotalPages}
                        </span>
                        <button
                          type="button"
                          className="btn btn--ghost btn--small"
                          disabled={studentTrailsPage === studentTrailsTotalPages}
                          onClick={onNextStudentTrailsPage}
                        >
                          Próxima
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : null}
          </section>
            </div>
          )}
        </>
      )}
    </>
  )
}
