import { Link } from 'react-router-dom'
import type { GabaritoPageViewProps, GabaritoSortBy } from '../types/gabaritoPageView'

export type {
  GabaritoTrailOption,
  GabaritoNumberOption,
  GabaritoSortBy,
  GabaritoSortDir,
  GabaritoSaveBanner,
  GabaritoQuestionRow,
  GabaritoPageViewProps,
} from '../types/gabaritoPageView'

function sortAria(
  sortBy: GabaritoSortBy,
  sortDir: 'asc' | 'desc',
  column: GabaritoSortBy,
): 'ascending' | 'descending' | 'none' {
  if (sortBy !== column) return 'none'
  return sortDir === 'asc' ? 'ascending' : 'descending'
}

function statusBadge(q: GabaritoPageViewProps['rows'][number]) {
  if (q.statusBadge === 'anulada') {
    return (
      <span
        className="badge badge--annulled"
        title={q.annulledReason || undefined}
      >
        anulada
      </span>
    )
  }
  if (q.statusBadge === 'faltando') {
    return <span className="badge badge--warn">faltando</span>
  }
  return <span className="badge badge--ok">{q.statusBadge}</span>
}

export function GabaritoPageView({
  loadingTrails,
  trailOptions,
  selectedTrailId,
  onSelectTrail,
  onlyActiveTrails,
  onOnlyActiveTrailsChange,
  trailsError,
  selectedTrailName,
  loadingData,
  saveDisabled,
  saveButtonLabel,
  onSaveAll,
  dataError,
  saveBanner,
  onlyMissing,
  onOnlyMissingChange,
  onlyAnnulled,
  onOnlyAnnulledChange,
  filterStage,
  onFilterStageChange,
  filterQuestion,
  onFilterQuestionChange,
  availableStages,
  availableQuestions,
  filtersSummary,
  sortBy,
  sortDir,
  onToggleSort,
  rows,
  emptyMessage,
  onDraftChange,
  onToggleAnnulled,
  annullingId,
}: GabaritoPageViewProps) {
  return (
    <>
      <header className="admin__header">
        <h1>Gabarito</h1>
        <p className="admin__lede muted">
          Preencha a resposta correta (<code>correct_option</code>) das questões
          de exercício em massa. Sem gabarito, as respostas dos alunos não geram
          acertos/erros. Questões anuladas ficam rastreadas e fora do
          denominador de acerto/erro.
        </p>
        <div className="gerenciamento-toolbar">
          <Link className="btn btn--ghost" to="/">
            ← Início
          </Link>
          <label className="gerenciamento-select">
            <span className="muted">Trilha</span>
            <select
              value={selectedTrailId ?? ''}
              onChange={(e) => {
                const next = e.target.value.trim()
                onSelectTrail(next || null)
              }}
              disabled={loadingTrails || trailOptions.length === 0}
            >
              <option value="">
                {loadingTrails ? 'Carregando trilhas…' : 'Selecione uma trilha'}
              </option>
              {trailOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field field--inline gabarito-toolbar-check">
            <input
              type="checkbox"
              checked={onlyActiveTrails}
              onChange={(e) => onOnlyActiveTrailsChange(e.target.checked)}
            />
            <span>só trilhas ativas</span>
          </label>
        </div>
      </header>

      {trailsError ? (
        <p className="banner banner--error" role="alert">
          {trailsError}
        </p>
      ) : null}

      {!selectedTrailId ? (
        <section className="panel">
          <p className="muted gerenciamento-placeholder">
            Selecione uma trilha para listar as questões de exercício e
            preencher o gabarito.
          </p>
        </section>
      ) : (
        <section className="panel">
          <div className="panel__head">
            <h2>
              {selectedTrailName}{' '}
              <span className="muted gerenciamento-id">({selectedTrailId})</span>
            </h2>
            <p className="admin__actions gerenciamento-detail-actions">
              {loadingData ? <span className="muted">Carregando…</span> : null}
              <button
                type="button"
                className="btn btn--small btn--primary"
                onClick={onSaveAll}
                disabled={saveDisabled}
              >
                {saveButtonLabel}
              </button>
            </p>
          </div>

          {dataError ? (
            <p className="banner banner--error" role="alert">
              {dataError}
            </p>
          ) : null}
          {saveBanner.kind === 'error' ? (
            <p className="banner banner--error" role="alert">
              {saveBanner.message}
            </p>
          ) : null}
          {saveBanner.kind === 'saved' ? (
            <p className="banner banner--success" role="status">
              {saveBanner.message}
            </p>
          ) : null}

          <div className="gabarito-filters">
            <label className="field field--inline gabarito-filters__check">
              <input
                type="checkbox"
                checked={onlyMissing}
                onChange={(e) => onOnlyMissingChange(e.target.checked)}
              />
              <span>só sem gabarito</span>
            </label>
            <label className="field field--inline gabarito-filters__check">
              <input
                type="checkbox"
                checked={onlyAnnulled}
                onChange={(e) => onOnlyAnnulledChange(e.target.checked)}
              />
              <span>só anuladas</span>
            </label>
            <label className="gabarito-filter-select">
              <span className="muted">Stage</span>
              <select
                value={filterStage === '' ? '' : String(filterStage)}
                onChange={(e) => {
                  const v = e.target.value.trim()
                  onFilterStageChange(v ? Number(v) : '')
                }}
                disabled={loadingData || availableStages.length === 0}
              >
                <option value="">Todos</option>
                {availableStages.map((n) => (
                  <option key={n.value} value={n.value}>
                    {n.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="gabarito-filter-select">
              <span className="muted">Questão</span>
              <select
                value={filterQuestion === '' ? '' : String(filterQuestion)}
                onChange={(e) => {
                  const v = e.target.value.trim()
                  onFilterQuestionChange(v ? Number(v) : '')
                }}
                disabled={loadingData || availableQuestions.length === 0}
              >
                <option value="">Todas</option>
                {availableQuestions.map((n) => (
                  <option key={n.value} value={n.value}>
                    {n.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="gabarito-filters__summary muted">{filtersSummary}</p>
          </div>

          <div className="table-wrap gabarito-table-wrap">
            <table className="table gabarito-table">
              <thead>
                <tr>
                  <th
                    className="gabarito-col-num gabarito-sort-th"
                    aria-sort={sortAria(sortBy, sortDir, 'stage')}
                  >
                    <button
                      type="button"
                      className={
                        sortBy === 'stage'
                          ? 'gabarito-sort-btn gabarito-sort-btn--active'
                          : 'gabarito-sort-btn'
                      }
                      onClick={() => onToggleSort('stage')}
                      disabled={loadingData}
                    >
                      Stage
                      <span className="gabarito-sort-indicator" aria-hidden>
                        {sortBy === 'stage'
                          ? sortDir === 'asc'
                            ? '↑'
                            : '↓'
                          : '↕'}
                      </span>
                    </button>
                  </th>
                  <th
                    className="gabarito-col-num gabarito-sort-th"
                    aria-sort={sortAria(sortBy, sortDir, 'question')}
                  >
                    <button
                      type="button"
                      className={
                        sortBy === 'question'
                          ? 'gabarito-sort-btn gabarito-sort-btn--active'
                          : 'gabarito-sort-btn'
                      }
                      onClick={() => onToggleSort('question')}
                      disabled={loadingData}
                    >
                      Questão
                      <span className="gabarito-sort-indicator" aria-hidden>
                        {sortBy === 'question'
                          ? sortDir === 'asc'
                            ? '↑'
                            : '↓'
                          : '↕'}
                      </span>
                    </button>
                  </th>
                  <th>Título</th>
                  <th>Conteúdo</th>
                  <th>Resposta correta</th>
                  <th className="gabarito-col-status">Status</th>
                  <th className="gabarito-col-actions">Ação</th>
                </tr>
              </thead>
              <tbody>
                {loadingData ? (
                  <tr>
                    <td colSpan={7} className="muted table__empty">
                      Carregando questões…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="muted table__empty">
                      {emptyMessage}
                    </td>
                  </tr>
                ) : (
                  rows.map((q) => (
                    <tr
                      key={q.id}
                      className={q.annulled ? 'gabarito-row--annulled' : undefined}
                    >
                      <td className="gabarito-col-num">{q.stageNumber}</td>
                      <td className="gabarito-col-num">{q.questionNumber}</td>
                      <td className="gabarito-text-cell">{q.title}</td>
                      <td className="gabarito-text-cell gabarito-content-cell">
                        {q.content}
                      </td>
                      <td className="gabarito-answer-cell">
                        <input
                          type="text"
                          className={
                            q.inputError
                              ? 'gabarito-input gabarito-input--error'
                              : 'gabarito-input'
                          }
                          value={q.inputValue}
                          onChange={(e) => onDraftChange(q.id, e.target.value)}
                          placeholder={q.placeholder}
                          aria-label={q.ariaLabel}
                          disabled={q.inputDisabled}
                        />
                        {q.inputError ? (
                          <span className="gabarito-input-error">{q.inputError}</span>
                        ) : null}
                        {q.annulled && q.annulledReason ? (
                          <span className="gabarito-annulled-reason muted">
                            Motivo: {q.annulledReason}
                          </span>
                        ) : null}
                      </td>
                      <td className="gabarito-col-status">{statusBadge(q)}</td>
                      <td className="gabarito-col-actions">
                        <button
                          type="button"
                          className={
                            q.annulled
                              ? 'btn btn--small btn--ghost'
                              : 'btn btn--small btn--ghost gabarito-annul-btn'
                          }
                          onClick={() => onToggleAnnulled(q.id)}
                          disabled={annullingId === q.id || loadingData}
                          title={
                            q.annulled
                              ? 'Remover anulação e voltar a contar no gabarito'
                              : 'Anular questão (não conta como acerto/erro)'
                          }
                        >
                          {annullingId === q.id
                            ? '…'
                            : q.annulled
                              ? 'Desanular'
                              : 'Anular'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  )
}
