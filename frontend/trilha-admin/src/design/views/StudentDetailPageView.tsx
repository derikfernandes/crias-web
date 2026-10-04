import { Link } from 'react-router-dom'
import type { StudentDetailPageViewProps } from '../types/studentDetailPageView'

export type {
  StudentDetailTrailRow,
  StudentDetailLinkableTrail,
  StudentDetailPageViewProps,
} from '../types/studentDetailPageView'

export function StudentDetailPageView(props: StudentDetailPageViewProps) {
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
    formSlot,
    hasStudent,
    loadingTrails,
    trailsError,
    editError,
    trailRows,
    editStage,
    editQuestion,
    editStatus,
    editBusy,
    onEditStageChange,
    onEditQuestionChange,
    onEditStatusChange,
    onStartEditTrail,
    onCancelEditTrail,
    onSaveTrailPosition,
    onUnlinkTrail,
    missingInstitutionId,
    institutionTrailsError,
    linkError,
    linkTrailId,
    onLinkTrailIdChange,
    linkStatus,
    onLinkStatusChange,
    linkBusy,
    loadingInstitutionTrails,
    linkableTrails,
    onLinkTrailSubmit,
    loadingLogs,
    logsError,
    logsEmpty,
    chatSlot,
    agentHistoryFilterLabel,
    onClearAgentHistoryFilter,
  } = props

  return (
    <>
      <header className="admin__header">
        <h1>Aluno</h1>
        <p className="admin__actions">
          <Link className="btn btn--ghost" to="/">
            ← Voltar ao início
          </Link>
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
        formSlot
      )}

      <section className="panel">
        <div className="panel__head">
          <h2>Trilhas vinculadas (student_trails)</h2>
          {loadingTrails ? (
            <span className="muted">Carregando progresso…</span>
          ) : null}
        </div>

        <p className="muted" style={{ marginTop: 0 }}>
          Abaixo aparecem as trilhas em que este aluno tem registro de progresso.
          Você pode vincular manualmente trilhas da mesma instituição do aluno.
        </p>

        {trailsError ? (
          <p className="banner banner--error" role="alert">
            {trailsError}
          </p>
        ) : null}
        {editError ? (
          <p className="banner banner--error" role="alert">
            {editError}
          </p>
        ) : null}

        {!loadingTrails && trailRows.length === 0 ? (
          <p className="muted">
            Nenhuma trilha vinculada ainda. Use o formulário abaixo para vincular,
            ou o player web pode criar e atualizar registros em{' '}
            <code>student_trails</code> automaticamente.
          </p>
        ) : null}

        {trailRows.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Trilha</th>
                  <th>Stage atual</th>
                  <th>Questão atual</th>
                  <th>Status</th>
                  <th>Início</th>
                  <th>Última interação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {trailRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link to={row.trailHref}>{row.trailLabel}</Link>
                      {row.trailIdSecondary ? (
                        <div className="muted" style={{ fontSize: '0.85em' }}>
                          <code>{row.trailIdSecondary}</code>
                          {row.inactiveHint ? ' · inativa' : null}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      {row.isEditing ? (
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={editStage}
                          onChange={(e) => onEditStageChange(e.target.value)}
                          disabled={editBusy}
                          style={{ width: '6.5rem' }}
                        />
                      ) : (
                        row.stageDisplay
                      )}
                    </td>
                    <td>
                      {row.isEditing ? (
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={editQuestion}
                          onChange={(e) => onEditQuestionChange(e.target.value)}
                          disabled={editBusy}
                          style={{ width: '6.5rem' }}
                        />
                      ) : (
                        row.questionDisplay
                      )}
                    </td>
                    <td>
                      {row.isEditing ? (
                        <select
                          value={editStatus}
                          onChange={(e) => onEditStatusChange(e.target.value)}
                          disabled={editBusy}
                        >
                          <option value="not_started">not_started</option>
                          <option value="in_progress">in_progress</option>
                          <option value="completed">completed</option>
                          <option value="blocked">blocked</option>
                        </select>
                      ) : (
                        <code>{row.status}</code>
                      )}
                    </td>
                    <td>{row.startedAtLabel}</td>
                    <td>{row.lastInteractionAtLabel}</td>
                    <td>
                      <div className="table__actions">
                        {row.isEditing ? (
                          <>
                            <button
                              type="button"
                              className="btn btn--small btn--primary"
                              onClick={() => onSaveTrailPosition(row.id)}
                              disabled={editBusy}
                            >
                              {editBusy ? 'Salvando…' : 'Salvar'}
                            </button>
                            <button
                              type="button"
                              className="btn btn--small btn--ghost"
                              onClick={onCancelEditTrail}
                              disabled={editBusy}
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="btn btn--small btn--ghost"
                            onClick={() => onStartEditTrail(row.id)}
                            disabled={editBusy}
                          >
                            Editar
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn--small btn--danger"
                          onClick={() => onUnlinkTrail(row.id)}
                          disabled={editBusy}
                        >
                          Desvincular
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {hasStudent ? (
          <>
            <h3 style={{ margin: '1.25rem 0 0.75rem', fontSize: '1.05rem' }}>
              Vincular nova trilha
            </h3>
            {missingInstitutionId ? (
              <p className="banner banner--error" role="alert">
                Este aluno não tem <code>institution_id</code>. Defina a instituição
                no cadastro acima antes de vincular trilhas.
              </p>
            ) : (
              <form className="form" onSubmit={onLinkTrailSubmit}>
                {institutionTrailsError ? (
                  <p className="banner banner--error" role="alert">
                    {institutionTrailsError}
                  </p>
                ) : null}
                {linkError ? (
                  <p className="banner banner--error" role="alert">
                    {linkError}
                  </p>
                ) : null}

                <label className="field">
                  <span>Trilha</span>
                  <select
                    value={linkTrailId}
                    onChange={(e) => onLinkTrailIdChange(e.target.value)}
                    disabled={
                      linkBusy || loadingInstitutionTrails || linkableTrails.length === 0
                    }
                  >
                    <option value="">
                      {loadingInstitutionTrails
                        ? 'Carregando trilhas…'
                        : linkableTrails.length === 0
                          ? 'Nenhuma trilha disponível (todas vinculadas ou sem trilhas na instituição)'
                          : 'Selecione…'}
                    </option>
                    {linkableTrails.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Status inicial</span>
                  <select
                    value={linkStatus}
                    onChange={(e) => onLinkStatusChange(e.target.value)}
                    disabled={linkBusy}
                  >
                    <option value="not_started">not_started</option>
                    <option value="in_progress">in_progress</option>
                  </select>
                </label>

                <div className="form__actions">
                  <button
                    type="submit"
                    className="btn btn--primary"
                    disabled={
                      linkBusy ||
                      !linkTrailId ||
                      loadingInstitutionTrails ||
                      linkableTrails.length === 0
                    }
                  >
                    {linkBusy ? 'Vinculando…' : 'Vincular trilha'}
                  </button>
                </div>
              </form>
            )}
          </>
        ) : null}
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Histórico de conversa (conversation_logs)</h2>
          {loadingLogs ? <span className="muted">Carregando histórico…</span> : null}
        </div>

        {agentHistoryFilterLabel ? (
          <div
            className="banner banner--info student-detail-agent-filter"
            role="status"
          >
            <p>
              Filtrado pelo agente <strong>{agentHistoryFilterLabel}</strong>{' '}
              (vindo do dashboard).
            </p>
            {onClearAgentHistoryFilter ? (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={onClearAgentHistoryFilter}
              >
                Mostrar todo o histórico
              </button>
            ) : null}
          </div>
        ) : null}

        {logsError ? (
          <p className="banner banner--error" role="alert">
            {logsError}
          </p>
        ) : null}

        {!loadingLogs && logsEmpty ? (
          <p className="muted">
            {agentHistoryFilterLabel
              ? 'Nenhum log deste agente para este aluno no histórico.'
              : 'Nenhum log de sessão encontrado para este aluno ainda. Cada mensagem da sessão gera um registro em conversation_logs.'}
          </p>
        ) : null}

        {chatSlot}
      </section>
    </>
  )
}
